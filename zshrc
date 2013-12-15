# Lines configured by zsh-newuser-install

export KEYTIMEOUT=1

[ -f "$HOME/.variables" ] && source "$HOME/.variables"
[ -f "$HOME/.path" ] && source "$HOME/.path"
[ -f "$HOME/.aliases" ] && source "$HOME/.aliases"

setopt autocd extendedglob nomatch
unsetopt beep notify
bindkey -v
bindkey '^P' up-history
bindkey '^N' down-history
bindkey '^?' backward-delete-char
bindkey '^h' backward-delete-char
bindkey '^w' backward-kill-word
bindkey '^r' history-incremental-search-backward

# End of lines configured by zsh-newuser-install
# The following lines were added by compinstall
zstyle :compinstall filename '/Users/douglasdrumond/.zshrc'

autoload -Uz compinit
compinit
# End of lines added by compinstall

if [ -d "$HOME/.rvm" ]; then
    source $HOME/.rvm/scripts/rvm
fi

if [ -d "$HOME/Applications/google-cloud-sdk/completion.zsh.inc" ]; then
    source $HOME/Applications/google-cloud-sdk/completion.zsh.inc
fi

function zle-line-init zle-keymap-select {
    VIM_PROMPT="%{$fg_bold[yellow]%} [% NORMAL]% %{$reset_color%}"
    RPS1="${${KEYMAP/vicmd/$VIM_PROMPT}/(main|viins)/} $EPS1"
    zle reset-prompt
}

zle -N zle-line-init
zle -N zle-keymap-select


setopt append_history no_inc_append_history no_share_history

function gi() { curl "https://www.gitignore.io/api/$@" ;}

function dex-method-count() {
  cat $1 | head -c 92 | tail -c 4 | hexdump -e '1/4 "%d\n"'
}

function dex-method-count-by-package() {
  dir=$(mktemp -d -t dex)
  baksmali $1 -o $dir
  for pkg in `find $dir/* -type d`; do
    smali $pkg -o $pkg/classes.dex
    count=$(dex-method-count $pkg/classes.dex)
    name=$(echo ${pkg:(${#dir} + 1)} | tr '/' '.')
    echo -e "$count\t$name"
  done
  rm -rf $dir
}

function shellesc() {
    local output
    # If any arguments are passed to the function, assume that's the input
    if [[ $# == 0 ]]; then
        output=$(ruby -e 'require "shellwords"; puts Shellwords.escape(STDIN.read.strip)')
    # otherwise, take input from STDIN so it can be used in piped commands
    else
        output=$(ruby -e 'require "shellwords"; puts Shellwords.escape(ARGV.join(" ").strip)' $@)
    fi

    echo "$output"
}

function unesc() {
    local output

    if [[ $# == 0 ]]; then
        output=$(ruby -r cgi -e 'require "cgi"; puts CGI.unescape(STDIN.read)')
    else
        output=$(ruby -e 'require "cgi"; puts CGI.unescape(ARGV.join(" "))' $@)
    fi

    echo "$output"
}

function shorthome() {
    local input
    if [[ $# == 0 ]]; then
        read input
        input=$(shellesc "$input")
    else
        input="$@"
    fi
    echo -n "$input" | sed -E "s/^${HOME//\//\\/}/~/"
}

function url2path() {
    local input output
    local copy=false
    if [[ $1 == '-c' ]]; then
        copy=true
        shift
    fi
    if [[ $# == 0 ]]; then
        read input
    else
        input=$@
    fi

    # 1. Replace 'file://', `%20` (space), and other entities in the url
    # 2. Add shell escaping for spaces and any non-legal characters
    # 3. Replace hardcoded home paths with the tilde abbreviation
    output=$(unesc ${input#file:\/\/} | shorthome)

    if $copy; then
        echo -n "$output"|pbcopy
        echo "Result in clipboard"
    else
        echo -n "$output"
    fi
}

[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

eval "$(thefuck --alias)"

test -e ${HOME}/.iterm2_shell_integration.zsh && source ${HOME}/.iterm2_shell_integration.zsh
