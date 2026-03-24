#!/usr/bin/env bash
set -e

echo "========================================"
echo "🚀 Configurando entorno Solana local"
echo "========================================"

# Verificar si estamos en Linux/Mac
if [[ "$OSTYPE" != "linux-gnu"* && "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Este script está diseñado para Linux/Mac. Para Windows usa WSL2."
    exit 1
fi

# ========================================
# 1. DEPENDENCIAS DEL SISTEMA
# ========================================

echo "--- Instalando dependencias del sistema ---"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux (Ubuntu/Debian)
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && \
        sudo apt-get install -y --no-install-recommends \
            ca-certificates \
            curl \
            git \
            build-essential \
            pkg-config \
            libssl-dev \
            libudev-dev \
            tini
    elif command -v yum &> /dev/null; then
        # Fedora/CentOS/RHEL
        sudo yum install -y \
            ca-certificates \
            curl \
            git \
            gcc \
            gcc-c++ \
            make \
            pkgconfig \
            openssl-devel \
            libudev-devel
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        sudo pacman -Sy --noconfirm \
            ca-certificates \
            curl \
            git \
            base-devel \
            pkgconf \
            openssl \
            systemd-libs
    else
        echo "⚠️  Gestor de paquetes no soportado. Instala manualmente: curl, git, build-essential, libssl-dev"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! command -v brew &> /dev/null; then
        echo "🔧 Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install curl git openssl pkg-config
fi

# ========================================
# 2. RUST
# ========================================

echo "--- Instalando Rust ---"

if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust ya instalado: $(rustc --version)"
fi

# Asegurar que cargo esté disponible en esta sesión
source "$HOME/.cargo/env"

# ========================================
# 3. SOLANA CLI
# ========================================

echo "--- Instalando Solana CLI ---"

if ! command -v solana &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
    
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.profile
else
    echo "✅ Solana CLI ya instalado: $(solana --version)"
fi

# Asegurar PATH para esta sesión
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

solana --version

# ========================================
# 4. NODE.JS (NVM)
# ========================================

echo "--- Instalando Node.js ---"

if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Agregar a .bashrc si no está
    if ! grep -q "NVM_DIR" ~/.bashrc; then
        echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
    fi
else
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    echo "✅ NVM ya instalado"
fi

# Instalar Node LTS si no está
if ! command -v node &> /dev/null; then
    nvm install --lts
    nvm use --lts
else
    echo "✅ Node.js ya instalado: $(node --version)"
fi

# ========================================
# 5. YARN
# ========================================

echo "--- Instalando Yarn ---"

if ! command -v yarn &> /dev/null; then
    npm install -g yarn
else
    echo "✅ Yarn ya instalado: $(yarn --version)"
fi

# ========================================
# 6. CONFIGURACIÓN SOLANA
# ========================================

echo "--- Configurando Solana ---"

solana config set --url https://api.devnet.solana.com

# Crear wallet solo si no existe
if [ ! -f ~/.config/solana/id.json ]; then
    echo "========================================"
    echo "================ Wallet Address: ======================"
    echo "========================================"
    solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json
else
    echo "✅ Wallet ya existe"
    echo "Dirección: $(solana address)"
fi

# ========================================
# 7. CREAR PROYECTO
# ========================================

echo "--- Creando proyecto dApp ---"

npx -y create-solana-dapp@latest \
    -t solana-foundation/templates/kit/react-vite-anchor \
    "template_codespaces"

echo "========================================"
echo "✅ Entorno listo para usar!!! :D"
echo "========================================"
echo ""
echo "Próximos pasos:"
echo "  cd template_codespaces"
echo "  npm run dev"
echo ""
echo "Recarga tu terminal o ejecuta: source ~/.bashrc"