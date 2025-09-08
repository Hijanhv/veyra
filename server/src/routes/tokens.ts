/**
 * Token Minting Routes
 * --------------------
 * Provides endpoints for minting MockERC20 tokens for testing purposes.
 * Allows users to mint tokens to their own wallets.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ethers } from 'ethers';
import { createRequire } from 'module';

const requireJson = createRequire(import.meta.url);
const mockERC20Abi = requireJson('../abi/MockERC20.json').abi;

// MockERC20 contract addresses from deployed addresses
const MOCK_TOKEN_ADDRESSES = [
  '0x5cbf5f4497fe60c0abba50f35c0e6732cf2bed22',
  '0x6f14740612417855f18174f90b00250d58d0b05f',
  '0xa6098ba1799d6c9eb8c2881b29f256259bb8710c',
  '0x0bb60c0123b0e1b81fc0909f50b0d2e6de410293'
];

// Request body schemas
interface MintTokenRequest {
  to: string;
  amount: string;
  tokenAddress?: string;
}

interface MintAllTokensRequest {
  to: string;
  amount?: string;
}

export async function tokenRoutes(fastify: FastifyInstance) {
  // Get RPC connection
  const getRpcProvider = () => {
    const rpcUrl = process.env.SONIC_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SONIC_RPC_URL not configured');
    }
    return new ethers.JsonRpcProvider(rpcUrl);
  };

  // Get wallet for transactions
  const getWallet = () => {
    const privateKey = process.env.STRATEGY_MANAGER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('STRATEGY_MANAGER_PRIVATE_KEY not configured');
    }
    const provider = getRpcProvider();
    return new ethers.Wallet(privateKey, provider);
  };

  // Get token information
  fastify.get('', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const provider = getRpcProvider();
      const tokens = [];

      for (const address of MOCK_TOKEN_ADDRESSES) {
        try {
          const contract = new ethers.Contract(address, mockERC20Abi, provider);
          const [name, symbol, decimals] = await Promise.all([
            contract.name() as Promise<string>,
            contract.symbol() as Promise<string>,
            contract.decimals() as Promise<bigint>
          ]);

          tokens.push({
            address,
            name,
            symbol,
            decimals: Number(decimals)
          });
        } catch (error) {
          fastify.log.error(`Failed to get info for token ${address}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve token information'
      });
    }
  });

  // Get token balance
  fastify.get<{ Params: { address: string; wallet: string } }>('/:address/balance/:wallet', async (request: FastifyRequest<{ Params: { address: string; wallet: string } }>, reply: FastifyReply) => {
    try {
      const { address, wallet } = request.params;

      if (!MOCK_TOKEN_ADDRESSES.includes(address.toLowerCase())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid token address'
        });
      }

      const provider = getRpcProvider();
      const contract = new ethers.Contract(address, mockERC20Abi, provider);

      const balance = await contract.balanceOf(wallet) as bigint;

      return {
        success: true,
        data: {
          address,
          wallet,
          balance: balance.toString()
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to retrieve token balance'
      });
    }
  });

  // Mint specific token
  fastify.post<{ Body: MintTokenRequest }>('/mint', async (request: FastifyRequest<{ Body: MintTokenRequest }>, reply: FastifyReply) => {
    try {
      const { to, amount, tokenAddress } = request.body;

      if (!to || !amount) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: to, amount'
        });
      }

      if (!ethers.isAddress(to)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid recipient address'
        });
      }

      let targetAddress = tokenAddress;
      if (!targetAddress) {
        // Default to first token if no address specified
        targetAddress = MOCK_TOKEN_ADDRESSES[0];
      }

      if (!MOCK_TOKEN_ADDRESSES.includes(targetAddress.toLowerCase())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid token address'
        });
      }

      const wallet = getWallet();
      const contract = new ethers.Contract(targetAddress, mockERC20Abi, wallet);

      // Parse amount (assume it's in token units, not wei)
      const amountBN = ethers.parseUnits(amount, 18);

      // Minting tokens

      const tx = await contract.mint(to, amountBN);
      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          txHash: receipt.hash,
          tokenAddress: targetAddress,
          to,
          amount: amount,
          blockNumber: receipt.blockNumber
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Token minting failed'
      });
    }
  });

  // Mint all available tokens
  fastify.post<{ Body: MintAllTokensRequest }>('/mint-all', async (request: FastifyRequest<{ Body: MintAllTokensRequest }>, reply: FastifyReply) => {
    try {
      const { to, amount = '1000' } = request.body;

      if (!to) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required field: to'
        });
      }

      if (!ethers.isAddress(to)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid recipient address'
        });
      }

      const wallet = getWallet();
      const amountBN = ethers.parseUnits(amount, 18);
      const results = [];

      // Minting all tokens

      for (const tokenAddress of MOCK_TOKEN_ADDRESSES) {
        try {
          const contract = new ethers.Contract(tokenAddress, mockERC20Abi, wallet);
          const tx = await contract.mint(to, amountBN);
          const receipt = await tx.wait();

          // Get token info
          const [name, symbol] = await Promise.all([
            contract.name() as Promise<string>,
            contract.symbol() as Promise<string>
          ]);

          results.push({
            success: true,
            tokenAddress,
            name,
            symbol,
            txHash: receipt.hash,
            amount,
            blockNumber: receipt.blockNumber
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          fastify.log.error(`Failed to mint token ${tokenAddress}: ${errorMessage}`);
          results.push({
            success: false,
            tokenAddress,
            error: errorMessage
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        data: {
          to,
          amount,
          results,
          summary: {
            total: MOCK_TOKEN_ADDRESSES.length,
            successful: successCount,
            failed: MOCK_TOKEN_ADDRESSES.length - successCount
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Bulk token minting failed'
      });
    }
  });
};