$designRoot = $PSScriptRoot
$screenJson = [System.IO.File]::ReadAllText((Join-Path $designRoot 'screens.json'))
$screens = $screenJson | ConvertFrom-Json
$ids = @($screens | ForEach-Object { $_.id })
foreach ($screen in $screens) {
    foreach ($action in $screen.actions) {
        if ($ids -notcontains $action[1]) { throw "Unknown destination $($action[1])" }
    }
}
foreach ($pair in @(@('preview.template.html','preview.html'),@('figma.template.js','figma-payload.js'))) {
    $template = [System.IO.File]::ReadAllText((Join-Path $designRoot $pair[0]))
    [System.IO.File]::WriteAllText((Join-Path $designRoot $pair[1]), $template.Replace('__SCREENS__', $screenJson), [System.Text.UTF8Encoding]::new($false))
}
Write-Output "Validated $($ids.Count) screen definitions and every action destination. Generated local preview and Figma payload."
