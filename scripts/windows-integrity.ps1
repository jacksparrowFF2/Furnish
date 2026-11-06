param([Parameter(Mandatory=$true)][string]$LiteralPath)
$ErrorActionPreference='Stop'
# Request only the mandatory label, not the privileged audit SACL.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class FurnishIntegrity {
 [DllImport("advapi32.dll",CharSet=CharSet.Unicode)] static extern uint GetNamedSecurityInfo(string path,uint type,uint info,out IntPtr owner,out IntPtr group,out IntPtr dacl,out IntPtr sacl,out IntPtr sd);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetAce(IntPtr acl,uint index,out IntPtr ace);
 [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
 [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthority(IntPtr sid,uint index);
 [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
 public static int[] Read(string path){IntPtr owner,group,dacl,sacl,sd;uint error=GetNamedSecurityInfo(path,1,16,out owner,out group,out dacl,out sacl,out sd);if(error!=0)throw new System.ComponentModel.Win32Exception((int)error);try{if(sacl!=IntPtr.Zero){int count=(ushort)Marshal.ReadInt16(sacl,4);for(uint i=0;i<count;i++){IntPtr ace;if(!GetAce(sacl,i,out ace))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());if(Marshal.ReadByte(ace)==17){var sid=IntPtr.Add(ace,8);uint n=Marshal.ReadByte(GetSidSubAuthorityCount(sid));return new[]{Marshal.ReadInt32(GetSidSubAuthority(sid,n-1)),1,(Marshal.ReadByte(ace,1)&16)!=0?1:0};}}}return new[]{8192,0,0};}finally{LocalFree(sd);}}
}
'@
$label=[FurnishIntegrity]::Read([IO.Path]::GetFullPath($LiteralPath))
@{rid=$label[0];labelPresent=($label[1] -eq 1);inherited=($label[2] -eq 1)} | ConvertTo-Json -Compress
