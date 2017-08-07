import XMonad
import XMonad.Util.EZConfig
import qualified XMonad.StackSet as W
import qualified Data.Map as M

import XMonad.Hooks.ManageDocks
import XMonad.Hooks.DynamicLog
import XMonad.Util.Run(spawnPipe)
import XMonad.Actions.CycleWS
import System.IO

main = do
    xmproc <- spawnPipe "/usr/bin/xmobar ~/.xmobarrc"
    xmonad $ defaultConfig {
          modMask = mod4Mask
        , manageHook = manageDocks <+> manageHook defaultConfig
        , layoutHook = avoidStruts  $  layoutHook defaultConfig
--        , borderWidth = 2
--        , focusedBorderColor = "#ffffff"
--        , normalBorderColor = "#444444"
        , focusFollowsMouse = False
--        , terminal = "urxvt"
        }
        `additionalKeysP` (
        [ ("C-=", spawn "backlight-adjust +")
        , ("C--", spawn "backlight-adjust -")
        , ("S-M-l", spawn "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Next")
        , ("S-M-h", spawn "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Previous")
        , ("S-M-p", spawn "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.PlayPause")
        , ("S-M-o", spawn "notify-send -t 1500 'Current Track' \"$(show_track)\"")
        , ("S-M-j", spawn "amixer -D pulse set Master 5%-")
        , ("S-M-k", spawn "amixer -D pulse set Master 5%+")
        , ("M-p", spawn "dmenu_run -i -nb '#282b57' -nf '#eeeeff' -sb '#555a9e' -fn 'Inconsolata-10'")
        , ("S-M-g", spawn "x-www-browser `xclip -o`")
        ])

--import XMonad
--import XMonad.Hooks.DynamicLog
--import XMonad.Hooks.ManageDocks
--import XMonad.Util.EZConfig(additionalKeys)
--import System.IO
--
--main = xmonad def
--    { modMask = mod4Mask -- Use Super instead of Alt
--    } `additionalKeys`
--    [ ((0 , 0x1008ff13), spawn "amixer -D pulse set Master 2%+"),
--      ((0 , 0x1008ff11), spawn "amixer -D pulse set Master 2%-"),
--      ((0 , 0x1008ff12), spawn "amixer -D pulse set Master toggle")
--      ]
