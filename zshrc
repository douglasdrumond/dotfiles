# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH=~/.oh-my-zsh

# Set name of the theme to load. Optionally, if you set this to "random"
# it'll load a random theme each time that oh-my-zsh is loaded.
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes
# ZSH_THEME="robbyrussell"
ZSH_THEME="dracula"

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion. Case
# sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Uncomment the following line to change how often to auto-update (in days).
# export UPDATE_ZSH_DAYS=13

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# The optional three formats: "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git vi-mode ubuntu node npm ruby sudo tig tmux docker)


source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# ssh
# export SSH_KEY_PATH="~/.ssh/rsa_id"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

export KEYTIMEOUT=1

[ -f "$HOME/.variables" ] && source "$HOME/.variables"
[ -f "$HOME/.path" ] && source "$HOME/.path"
[ -f "$HOME/.aliases" ] && source "$HOME/.aliases"

setopt autocd extendedglob nomatch
unsetopt beep notify
#bindkey -v
#bindkey '^P' up-history
#bindkey '^N' down-history
#bindkey '^?' backward-delete-char
#bindkey '^h' backward-delete-char
#bindkey '^w' backward-kill-word
#bindkey '^r' history-incremental-search-backward

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

function gi() { curl "https://www.gitignore.io/api/$@" ;}

eval "$(thefuck --alias)"

function gnf() { git checkout -b feature/$@ }
function gcof() { git checkout feature/$@ }

if [ -d "$HOME/.rvm" ]; then
    source $HOME/.rvm/scripts/rvm
fi

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

test -e ${HOME}/.iterm2_shell_integration.zsh && source ${HOME}/.iterm2_shell_integration.zsh

. $HOME/.asdf/asdf.sh

. $HOME/.asdf/completions/asdf.bash

source $HOME/.rvm/scripts/rvm
# Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.rvm/bin"
