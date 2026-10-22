# OXENIQ — Security Policy & Threat Model

## 1. Security Architecture Principles

1. **Least Privilege**: Administrative privileges are restricted to strictly necessary operations (circuit-breaker pause).
2. **Two-Step Ownership Transfer**: OpenZeppelin `Ownable2Step` eliminates accidental burns or lost keys when transferring contract administration.
3. **No Fees-On-Transfer**: The base BEP-20 token does NOT apply transfer fees or balance deductions inside `transfer()` or `transferFrom()`. This prevents severe integration bugs with DEX routers, lending pools, and cross-chain bridges.
4. **Zero Float Math**: All accounting and token allocations use integer arithmetic with explicit rounding guards.
5. **No Secrets in Code**: Private keys, RPC credentials, and sensitive API secrets are never committed to version control.

---

## 2. Threat Analysis & Mitigations

| Threat | Impact | Mitigation Strategy |
|---|---|---|
| **Private Key Compromise** | Critical | Deploy with hardware wallet / multi-sig (Gnosis Safe). Strict `.gitignore` and environment separation. |
| **Reentrancy Attacks** | High | Standard Checks-Effects-Interactions pattern; OpenZeppelin `ReentrancyGuard` on allocation modules. |
| **Integer Truncation Dust** | Low | Split arithmetic derives remainder by subtraction: `remainder = total - primaryShare`. |
| **Phishing / Malicious DApp** | High | Clear domain validation, verified contract address badges, zero seed-phrase prompts. |
| **Front-Running / MEV on DEX** | Medium | Slippage controls and deadline parameters enforced on all swap interactions. |

---

## 3. Emergency Incident Response
In the event of an exploit or critical vulnerability:
1. Trigger `pause()` on `OxeniqToken` via multi-sig.
2. Freeze allocation distributions via `AllocationManager`.
3. Notify the community via official channels with transparent disclosure.
