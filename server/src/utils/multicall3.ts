import { Contract, Interface, AbstractProvider } from 'ethers';

/**
 * Multicall3 Utilities - Making Blockchain Calls Super Efficient! 🚀
 * ===================================================================
 * 
 * PROBLEM: Imagine you want to check the APY of 5 different strategies.
 * Without multicall, you'd make 5 separate blockchain calls:
 * - Call strategy1.apy() → wait for response
 * - Call strategy2.apy() → wait for response  
 * - Call strategy3.apy() → wait for response
 * - Call strategy4.apy() → wait for response
 * - Call strategy5.apy() → wait for response
 * Total time: 5 x network delay = SLOW! 😴
 *
 * SOLUTION: Multicall3 lets us bundle all 5 calls into ONE blockchain request:
 * - Send [strategy1.apy(), strategy2.apy(), strategy3.apy(), strategy4.apy(), strategy5.apy()]
 * - Get back [result1, result2, result3, result4, result5] in one response
 * Total time: 1 x network delay = FAST! ⚡
 *
 * HOW IT WORKS:
 * 1. We prepare each function call by encoding it into raw bytes (like packing a suitcase)
 * 2. We send all encoded calls to the Multicall3 contract on the blockchain
 * 3. Multicall3 executes each call and collects all the results
 * 4. We unpack the results and convert them back into readable values
 *
 * This is especially useful for our vault service because we need to check:
 * - Multiple strategy APYs
 * - Multiple strategy allocations  
 * - Multiple adapter states
 * All at once, instead of making dozens of separate calls!
 */
const MULTICALL3_ABI = [
  'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) public returns (tuple(bool success, bytes returnData)[] memory returnData)'
] as const;

/**
 * Represents one function call that we want to include in our multicall batch.
 * Think of this like an envelope containing:
 * - target: The contract address we want to call (like a mailing address)
 * - callData: The encoded function call (like the letter contents, but in computer language)
 * - name: A friendly label so we can identify this call later (like writing "Strategy1 APY" on the envelope)
 */
export type MulticallCall = { target: string; callData: string; name: string };

/**
 * The main function that sends our batch of calls to the blockchain!
 * 
 * Think of this like sending a package with multiple items to different addresses,
 * but the postal service (Multicall3) delivers them all in one trip.
 *
 * @param provider - Our connection to the blockchain (like internet connection)
 * @param multicallAddress - The address of the Multicall3 contract on the blockchain
 * @param calls - Array of function calls we want to execute
 * 
 * IMPORTANT: We set requireSuccess=false, which means:
 * - If one call fails (maybe a strategy doesn't exist), we still get results from the others
 * - Instead of the whole batch failing, we just mark that one call as failed
 * - This prevents one bad strategy from breaking our entire data fetch!
 * 
 * @returns Array of results, each containing:
 * - name: The friendly label we gave this call
 * - success: Did this specific call work?
 * - returnData: The raw result (still needs to be decoded)
 */
export async function tryAggregate(
  provider: AbstractProvider,
  multicallAddress: string,
  calls: MulticallCall[]
): Promise<Array<{ name: string; success: boolean; returnData: string }>> {
  const mc = new Contract(multicallAddress, MULTICALL3_ABI, provider) as unknown as {
    tryAggregate: ((
      requireSuccess: boolean,
      calls: Array<{ target: string; callData: string }>
    ) => Promise<Array<{ success: boolean; returnData: string }>>) & {
      staticCall: (
        requireSuccess: boolean,
        calls: Array<{ target: string; callData: string }>
      ) => Promise<Array<{ success: boolean; returnData: string }>>;
    };
  };
  // Build the input for Multicall3 (strip to target + callData only)
  // Use staticCall so this executes as a read with a provider-only Contract
  const res = await mc.tryAggregate.staticCall(
    false,
    calls.map(({ target, callData }) => ({ target, callData }))
  );
  // Attach our original `name` back to each result for easy matching upstream
  return res.map((r, i) => ({ name: calls[i]!.name, success: r.success, returnData: r.returnData }));
}

/**
 * Helper function to prepare multiple function calls for the same contract.
 * 
 * Imagine you want to call several functions on your vault contract:
 * - vault.totalAssets()
 * - vault.allocations(strategy1Address)
 * - vault.allocations(strategy2Address)
 * 
 * Instead of manually encoding each one, this function does it for you!
 *
 * @param iface - The contract's ABI interface (like a dictionary that translates function names to computer code)
 * @param contractAddress - Which contract we're calling (all calls will go to this address)
 * @param specs - Array of function calls to prepare, each containing:
 *   - fragment: Function name like 'apy()' or 'allocations(address)'
 *   - args: Function parameters (like passing a strategy address to allocations())
 *   - key: Optional custom name for this call (defaults to the function name)
 *
 * @returns Array of MulticallCall objects ready to be sent via tryAggregate()
 * 
 * Example:
 * buildCalls(vaultInterface, '0xVaultAddress', [
 *   { fragment: 'totalAssets()' },
 *   { fragment: 'allocations(address)', args: ['0xStrategy1'], key: 'strategy1_allocation' }
 * ])
 */
export function buildCalls(
  iface: Interface,
  contractAddress: string,
  specs: Array<{ fragment: string; args?: readonly unknown[]; key?: string }>
): MulticallCall[] {
  const out: MulticallCall[] = [];
  for (const s of specs) {
    try {
      // Validate the function exists on this ABI
      iface.getFunction(s.fragment);
      // Encode calldata for (fragment, args)
      const callData = iface.encodeFunctionData(s.fragment, s.args ?? []);
      // Store the encoded call with a stable `name` label
      out.push({ target: contractAddress, callData, name: s.key ?? s.fragment });
    } catch {
      // Skip unknown fragments so callers can pass mixed ABIs safely
    }
  }
  return out;
}

/**
 * Unpacks a raw blockchain result back into readable values.
 * 
 * When the blockchain returns data, it's in raw bytes (like a compressed file).
 * This function uncompresses it back into the actual values we can use.
 *
 * @param iface - The contract's ABI interface (our decoder dictionary)
 * @param fragment - Which function this result came from (so we know how to decode it)
 * @param returnData - The raw bytes returned from the blockchain
 * @returns Array of decoded values (the actual results we wanted)
 *
 * Example:
 * If we called strategy.apy() and got back raw bytes "0x000...1388",
 * this function would decode it to [5000] (meaning 50.00% APY in basis points)
 */
export function decodeResult(
  iface: Interface,
  fragment: string,
  returnData: string
): unknown[] {
  return iface.decodeFunctionResult(fragment, returnData) as unknown[];
}
