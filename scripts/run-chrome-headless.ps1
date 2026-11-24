Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$chromePath = "C:\Users\Dell\AppData\Local\Google\Chrome\Application\chrome.exe"
$userDataDir = "C:\Users\Dell\AppData\Local\Google\Chrome\User Data"

$chromeProc = Start-Process -FilePath $chromePath -ArgumentList "--headless=new", "--remote-debugging-port=9222", "--user-data-dir=`"$userDataDir`"", "--disable-gpu", "about:blank" -PassThru
Start-Sleep -Seconds 3

for ($i = 0; $i -lt 15; $i++) {
  try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:9222/json/version" -ErrorAction Stop
    if ($res -and $res.webSocketDebuggerUrl) {
      $wsPath = ($res.webSocketDebuggerUrl -replace '^ws://[^/]+','')
      $lines = @("9222", $wsPath)
      [System.IO.File]::WriteAllLines("$userDataDir\DevToolsActivePort", $lines)
      Write-Host "DevToolsActivePort successfully written with path: $wsPath"
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Wait-Process -Id $chromeProc.Id
