"""Read a JD or Taobao product and archive its price with the Furnish model."""
import argparse
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import os
from pathlib import Path
import re
import subprocess
import sys


TOOLS = {"jd": ("jd_product", "sku", "name"), "taobao": ("taobao_product", "id", "title")}
HERE = Path(__file__).resolve().parent


async def read_product(platform, item_code):
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    tool, _, _ = TOOLS[platform]
    arg = "sku" if platform == "jd" else "item_id"
    env = dict(os.environ)
    env.setdefault("NO_PROXY", "localhost,127.0.0.1,::1")
    env.setdefault("no_proxy", "localhost,127.0.0.1,::1")
    params = StdioServerParameters(
        command=sys.executable, args=[str(HERE / "cn-scraper-server.py")], env=env
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as client:
            await client.initialize()
            result = await client.call_tool(tool, {arg: item_code})
    data = result.structuredContent
    if data is None:
        message = next((c.text for c in result.content if c.type == "text"), "{}")
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            raise ValueError(message) from None
    if result.isError or not isinstance(data, dict):
        raise ValueError(str(data))
    return data


def price_in_fen(raw):
    value = str(raw).strip().removeprefix("¥").removeprefix("￥").strip()
    if not re.fullmatch(r"(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]{1,2})?", value):
        return None
    amount = Decimal(value.replace(",", "")) * 100
    return int(amount) if amount <= 1_000_000_000 else None


def observation(args, data, captured_on):
    if data.get("ok") is False or data.get("error") or data.get("error_code"):
        raise ValueError(data.get("error") or data.get("error_code") or str(data))
    _, id_key, title_key = TOOLS[args.platform]
    title = data.get(title_key)
    if str(data.get(id_key)) != args.item_code or not isinstance(title, str) or not title.strip():
        raise ValueError("采集回执缺少对应的商品编号或标题")
    price = price_in_fen(data.get("price"))
    if args.platform == "taobao" and data.get("price_status") != "displayed":
        price = None
    price_scope = "sku" if args.platform == "jd" else "default-selection"
    return {
        "productId": args.product_id,
        **({"modelName": args.model_name} if args.model_name is not None else {}),
        "sourceUrl": args.source_url or data.get("url"),
        "capturedOn": captured_on,
        "capture": {
            "title": title.strip(),
            "shop": data.get("shop") or "",
            "itemCode": args.item_code,
            "variant": args.variant or "",
            "priceFen": price,
            "priceScope": price_scope if price is not None else "unknown",
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("product_id", help="Furnish product dossier ID")
    parser.add_argument("platform", choices=TOOLS)
    parser.add_argument("item_code", help="JD SKU or Taobao/Tmall item ID")
    parser.add_argument("--model-name", help="Name for a new product dossier")
    parser.add_argument("--source-url", help="Complete original URL for the same listing")
    parser.add_argument("--variant", help="Verified specification or variant description")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,99}", args.product_id):
        parser.error("invalid Furnish product dossier ID")
    if not re.fullmatch(r"[0-9]{1,30}", args.item_code):
        parser.error("item code must contain 1 to 30 digits")
    try:
        data = asyncio.run(read_product(args.platform, args.item_code))
        captured_on = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
        record = observation(args, data, captured_on)
        result = subprocess.run(
            ["node", str(HERE / "archive-model-product.cjs")],
            input=json.dumps(record, ensure_ascii=False), encoding="utf-8", check=False
        )
        return result.returncode
    except (OSError, ValueError, RuntimeError, ImportError) as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
