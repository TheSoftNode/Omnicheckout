#!/bin/bash

# OmniCheckout Hook Deployment Script
# This script deploys the OmniCheckoutHook contract to various CCTP V2 supported networks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# USDC contract addresses for different networks
declare -A USDC_ADDRESSES
# Mainnet
USDC_ADDRESSES["ethereum"]="0xA0b86a33E6441C8C68b7B7D1cF6b82B7D3D3c3e0"
USDC_ADDRESSES["arbitrum"]="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
USDC_ADDRESSES["base"]="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_ADDRESSES["avalanche"]="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
USDC_ADDRESSES["optimism"]="0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
USDC_ADDRESSES["polygon"]="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"

# Testnets
USDC_ADDRESSES["sepolia"]="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
USDC_ADDRESSES["arbitrumSepolia"]="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
USDC_ADDRESSES["baseSepolia"]="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
USDC_ADDRESSES["avalancheFuji"]="0x5425890298aed601595a70AB815c96711a31Bc65"
USDC_ADDRESSES["optimismSepolia"]="0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
USDC_ADDRESSES["polygonAmoy"]="0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582"
USDC_ADDRESSES["lineaSepolia"]="0x176211869cA2b568f2A7D4EE941E073a821EE1ff"

# Default configuration
DEFAULT_CHARITY_ADDRESS="0x0000000000000000000000000000000000000000"
DEFAULT_CHARITY_PERCENTAGE="250" # 2.5%

print_usage() {
    echo -e "${BLUE}Usage: $0 [OPTIONS]${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -n, --network NETWORK          Target network (required)"
    echo "  -c, --charity ADDRESS          Charity address (optional)"
    echo "  -p, --percentage PERCENTAGE    Charity percentage in basis points (optional, default: 250 = 2.5%)"
    echo "  -u, --usdc ADDRESS             USDC contract address (optional, auto-detected)"
    echo "  -v, --verify                   Verify contract on block explorer"
    echo "  -h, --help                     Show this help message"
    echo ""
    echo -e "${YELLOW}Supported Networks:${NC}"
    echo "  Mainnet: ethereum, arbitrum, base, avalanche, optimism, polygon"
    echo "  Testnet: sepolia, arbitrumSepolia, baseSepolia, avalancheFuji, optimismSepolia, polygonAmoy, lineaSepolia"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 -n sepolia -c 0x1234567890123456789012345678901234567890"
    echo "  $0 -n arbitrumSepolia -c 0x1234567890123456789012345678901234567890 -p 100"
    echo "  $0 -n baseSepolia --verify"
}

deploy_contract() {
    local network=$1
    local charity_address=$2
    local charity_percentage=$3
    local usdc_address=$4
    local verify=$5

    echo -e "${BLUE}Deploying OmniCheckoutHook to ${network}...${NC}"
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  USDC Address: ${usdc_address}"
    echo "  Charity Address: ${charity_address}"
    echo "  Charity Percentage: ${charity_percentage} basis points ($(echo "scale=2; ${charity_percentage}/100" | bc)%)"
    echo ""

    # Build deployment command
    local cmd="npx hardhat ignition deploy ignition/modules/OmniCheckoutHook.ts --network ${network}"
    cmd="${cmd} --parameters '{\"usdc\":\"${usdc_address}\",\"charityAddress\":\"${charity_address}\",\"charityPercentage\":${charity_percentage}}'"
    
    if [ "$verify" = true ]; then
        cmd="${cmd} --verify"
    fi

    # Execute deployment
    echo -e "${YELLOW}Executing: ${cmd}${NC}"
    eval $cmd

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Save the deployed contract address"
        echo "2. Update your backend configuration with the new address"
        echo "3. Configure charity settings if needed"
        echo "4. Test the hook functionality"
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        exit 1
    fi
}

# Parse command line arguments
NETWORK=""
CHARITY_ADDRESS=$DEFAULT_CHARITY_ADDRESS
CHARITY_PERCENTAGE=$DEFAULT_CHARITY_PERCENTAGE
USDC_ADDRESS=""
VERIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -c|--charity)
            CHARITY_ADDRESS="$2"
            shift 2
            ;;
        -p|--percentage)
            CHARITY_PERCENTAGE="$2"
            shift 2
            ;;
        -u|--usdc)
            USDC_ADDRESS="$2"
            shift 2
            ;;
        -v|--verify)
            VERIFY=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$NETWORK" ]; then
    echo -e "${RED}Error: Network is required${NC}"
    print_usage
    exit 1
fi

# Auto-detect USDC address if not provided
if [ -z "$USDC_ADDRESS" ]; then
    USDC_ADDRESS=${USDC_ADDRESSES[$NETWORK]}
    if [ -z "$USDC_ADDRESS" ]; then
        echo -e "${RED}Error: Unknown network '${NETWORK}' and no USDC address provided${NC}"
        print_usage
        exit 1
    fi
fi

# Validate charity percentage
if ! [[ "$CHARITY_PERCENTAGE" =~ ^[0-9]+$ ]] || [ "$CHARITY_PERCENTAGE" -gt 1000 ]; then
    echo -e "${RED}Error: Charity percentage must be a number between 0 and 1000 (0-10%)${NC}"
    exit 1
fi

# Check if .env file exists and has required variables
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Make sure you have set the required environment variables.${NC}"
fi

# Deploy the contract
deploy_contract "$NETWORK" "$CHARITY_ADDRESS" "$CHARITY_PERCENTAGE" "$USDC_ADDRESS" "$VERIFY"
