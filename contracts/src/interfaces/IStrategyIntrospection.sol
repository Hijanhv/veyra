// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IStrategyIntrospection
/// @notice Introspection interface that returns a flexible list of typed components.
///         Uses a compact, extensible shape that avoids hardcoding specific
///         protocol fields in the top-level struct.
interface IStrategyIntrospection {
    /// @notice Component type for off-chain routing. Add new kinds as you integrate more protocols.
    enum ComponentKind {
        Lending, // ILendingAdapter-like
        Eggs, // IEggsAdapter
        Rings, // IRingsAdapter
        StS, // IStSAdapter
        Pendle, // IPendleAdapter
        Dex, // IBeetsAdapter / IShadowAdapter / ISwapXAdapter
        Custom // anything else; details in `extra`
    }

    /// @notice Generic component descriptor.
    /// @dev token0/token1 allow passing supply/borrow tokens, or paired tokens for DEX/LP.
    ///      `pool`/`gauge` are for DEXs. `extra` may carry protocol-specific info (ABI-encoded).
    struct Component {
        ComponentKind kind;
        address adapter;
        address token0; // e.g., supplyToken or first pool token
        address token1; // e.g., borrowToken or second pool token
        address pool; // pool address/identifier (if any)
        address gauge; // staking gauge (if any)
        bytes extra; // free-form extra data
        string name; // short human label for UI (e.g., "Beets", "SwapX")
    }

    /// @notice Return the base asset, schema version and all components.
    function components()
        external
        view
        returns (address asset, uint8 schemaVersion, Component[] memory comps);

    /// @notice Optional events to help off-chain indexers cache configuration.
    event StrategyConfigured(
        address indexed strategy,
        address asset,
        uint8 schemaVersion
    );
    event StrategyComponent(
        address indexed strategy,
        ComponentKind kind,
        address adapter,
        address token0,
        address token1,
        address pool,
        address gauge,
        bytes extra
    );
}
