param([Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$Icon,[switch]$VerifyOnly)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
public class FurnishWindowsIcon {
 delegate bool NameCallback(IntPtr module,IntPtr type,IntPtr name,IntPtr param);
 delegate bool LanguageCallback(IntPtr module,IntPtr type,IntPtr name,ushort language,IntPtr param);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr LoadLibraryEx(string file,IntPtr reserved,uint flags);
 [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool EnumResourceNames(IntPtr module,IntPtr type,NameCallback callback,IntPtr param);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool EnumResourceLanguages(IntPtr module,IntPtr type,IntPtr name,LanguageCallback callback,IntPtr param);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr BeginUpdateResource(string file,bool deleteExisting);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool UpdateResource(IntPtr update,IntPtr type,IntPtr name,ushort language,byte[] data,uint length);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool EndUpdateResource(IntPtr update,bool discard);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr FindResourceEx(IntPtr module,IntPtr type,IntPtr name,ushort language);
 [DllImport("kernel32.dll")] static extern uint SizeofResource(IntPtr module,IntPtr resource);
 [DllImport("kernel32.dll")] static extern IntPtr LoadResource(IntPtr module,IntPtr resource);
 [DllImport("kernel32.dll")] static extern IntPtr LockResource(IntPtr resource);
 struct Entry {public int type,id;public ushort language;}
 static List<Entry> Entries(IntPtr module){var entries=new List<Entry>();bool named=false;foreach(int type in new[]{3,14}){EnumResourceNames(module,new IntPtr(type),(m,t,n,p)=>{long id=n.ToInt64();if(id<0||id>65535){named=true;return false;}EnumResourceLanguages(m,t,n,(a,b,d,l,e)=>{entries.Add(new Entry{type=type,id=(int)id,language=l});return true;},IntPtr.Zero);return true;},IntPtr.Zero);}if(named)throw new InvalidOperationException("Named icon resources are not supported");return entries;}
 static byte[] Resource(IntPtr module,int type,int id){var resource=FindResourceEx(module,new IntPtr(type),new IntPtr(id),0);if(resource==IntPtr.Zero)throw new InvalidOperationException("Missing icon resource");var data=new byte[SizeofResource(module,resource)];Marshal.Copy(LockResource(LoadResource(module,resource)),data,0,data.Length);return data;}
 static bool Same(byte[] a,byte[] b){if(a.Length!=b.Length)return false;for(int i=0;i<a.Length;i++)if(a[i]!=b[i])return false;return true;}
 public static int Apply(string executable,string icon,bool verifyOnly){byte[] ico=File.ReadAllBytes(icon);if(ico.Length<6||BitConverter.ToUInt16(ico,2)!=1)throw new InvalidDataException("Invalid ICO");int count=BitConverter.ToUInt16(ico,4);if(count<1||ico.Length<6+count*16)throw new InvalidDataException("Invalid ICO directory");var images=new List<byte[]>();byte[] group=new byte[6+count*14];Array.Copy(ico,group,6);for(int i=0;i<count;i++){int entry=6+i*16,length=(int)BitConverter.ToUInt32(ico,entry+8),offset=(int)BitConverter.ToUInt32(ico,entry+12);if(length<=0||offset<0||offset>ico.Length-length)throw new InvalidDataException("Invalid icon frame");byte[] image=new byte[length];Array.Copy(ico,offset,image,0,length);images.Add(image);Array.Copy(ico,entry,group,6+i*14,12);Array.Copy(BitConverter.GetBytes((ushort)(i+1)),0,group,6+i*14+12,2);}
  if(!verifyOnly){var module=LoadLibraryEx(executable,IntPtr.Zero,34);if(module==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());List<Entry> old;try{old=Entries(module);}finally{FreeLibrary(module);}var update=BeginUpdateResource(executable,false);if(update==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());bool success=false;try{foreach(var entry in old)if(!UpdateResource(update,new IntPtr(entry.type),new IntPtr(entry.id),entry.language,null,0))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());for(int i=0;i<count;i++)if(!UpdateResource(update,new IntPtr(3),new IntPtr(i+1),0,images[i],(uint)images[i].Length))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());if(!UpdateResource(update,new IntPtr(14),new IntPtr(1),0,group,(uint)group.Length))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());success=true;}finally{if(!EndUpdateResource(update,!success))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}}
  var check=LoadLibraryEx(executable,IntPtr.Zero,34);if(check==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());try{if(!Same(Resource(check,14,1),group))throw new InvalidDataException("Icon group verification failed");for(int i=0;i<count;i++)if(!Same(Resource(check,3,i+1),images[i]))throw new InvalidDataException("Icon frame verification failed");int groups=Entries(check).FindAll(e=>e.type==14).Count;if(groups!=1)throw new InvalidDataException("Unexpected old icon groups remain");}finally{FreeLibrary(check);}return count;
 }
}
'@
$count=[FurnishWindowsIcon]::Apply([IO.Path]::GetFullPath($Executable),[IO.Path]::GetFullPath($Icon),[bool]$VerifyOnly)
@{verified=$true;frames=$count;updated=(!$VerifyOnly)} | ConvertTo-Json -Compress
