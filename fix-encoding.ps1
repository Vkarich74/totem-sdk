$files = Get-ChildItem "C:\Work\totem-sdk\src" -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx,*.json,*.html,*.css

foreach ($f in $files) {

    $text = [System.IO.File]::ReadAllText($f.FullName)

    if ($text -match "Ð|Ñ|∩╗┐|├") {

        try {

            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($text)
            $fixed = [System.Text.Encoding]::UTF8.GetString($bytes)

            if ($fixed -ne $text) {

                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                [System.IO.File]::WriteAllText($f.FullName, $fixed, $utf8NoBom)

                Write-Host "FIXED:" $f.FullName
            }

        }
        catch {
        }

    }

}