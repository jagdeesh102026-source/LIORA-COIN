$dest = "$env:TEMP\checklist_dir"
[xml]$xml = Get-Content "$dest\word\document.xml" -Raw
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$nodes = $xml.SelectNodes("//w:p", $ns)
$lines = foreach ($p in $nodes) {
    $t = ($p.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.InnerText }) -join ""
    if ($t.Trim().Length -gt 0) { $t }
}
$fullText = $lines -join "`r`n"
Set-Content -Path "scripts\checklist_extracted.txt" -Value $fullText -Encoding utf8
Write-Output "Extracted $($lines.Count) lines to scripts\checklist_extracted.txt"
