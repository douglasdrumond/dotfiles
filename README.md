# dotfiles

## Install dependencies

### macOS

#### The Fuck autocorrect
```
brew install thefuck
```

#### ASDF dependency management
```
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.10.0
```

#### Use ASDF to install NodeJS
```
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs latest
```

#### Oh My Zsh
```
git clone https://github.com/ohmyzsh/ohmyzsh.git ~/.oh-my-zsh
```

```
git clone https://github.com/jeffreytse/zsh-vi-mode \
  $ZSH_CUSTOM/plugins/zsh-vi-mode
```

```
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```
