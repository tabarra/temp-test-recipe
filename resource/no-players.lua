AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    CancelEvent()
    setKickReason('This is a debug server.')
end)
