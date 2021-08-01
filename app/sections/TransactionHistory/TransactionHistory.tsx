import { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { format } from "date-fns";

import Connector from "../../containers/Connector";

const START_BLOCK = 26499057;
const CONFIRMATIONS = 21;
const ETHERSCAN_URL = "https://kovan.etherscan.io";
const EXPLORER_URL = "https://kovan-optimistic.etherscan.io";

type Transaction = {
  hash: string;
  blockNumber: number;
  wallet: string;
  amount: number;
  timestamp: number;
};

const TransactionHistory = () => {
  const { depositContract, wallet, provider, signer, providerL2 } =
    Connector.useContainer();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!provider || !depositContract || !wallet || !providerL2) return;
    try {
      const filters = depositContract.filters.EtherReceived(wallet);
      const [logs, lastBlock] = await Promise.all([
        provider.getLogs({
          address: depositContract.address,
          ...filters,
          fromBlock: START_BLOCK,
        }),
        provider.getBlockNumber(),
      ]);
      const events = await Promise.all(
        logs.map(async (l) => {
          const { args } = depositContract.interface.parseLog(l);
          const block = await provider.getBlock(l.blockNumber);
          const timestamp = Number(block.timestamp * 1000);
          return {
            hash: l.transactionHash,
            blockNumber: l.blockNumber,
            wallet: args.emitter,
            amount: args.amount / 1e18,
            timestamp,
          };
        })
      );
      setTransactions(events);
      setCurrentBlock(Number(lastBlock));
    } catch (e) {
      console.log(e);
    }
  }, [provider, depositContract, wallet, providerL2]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <Wrapper>
      <h1>Transaction History</h1>
      <Transactions>
        <RowRight>
          <RefreshButton onClick={fetchTransactions}>Refresh</RefreshButton>
        </RowRight>
        {currentBlock && transactions && transactions.length > 0 ? (
          transactions.map((tx) => {
            return (
              <Transaction key={tx.hash}>
                <div>
                  Hash:{" "}
                  <Link
                    href={`${ETHERSCAN_URL}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tx.hash}
                  </Link>
                </div>
                <div>Block: {tx.blockNumber} </div>
                <div>
                  Date: {format(new Date(tx.timestamp), "dd/MM/Y, h:mm aaa")}{" "}
                </div>
                <div>{`Confirmations: ${
                  currentBlock - tx.blockNumber > CONFIRMATIONS
                    ? CONFIRMATIONS
                    : currentBlock - tx.blockNumber
                }/${CONFIRMATIONS}`}</div>
                <div>Amount: {tx.amount} ether</div>
                <div>
                  <Link
                    href={`${EXPLORER_URL}/address/${wallet}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Check status on OE explorer
                  </Link>
                </div>
              </Transaction>
            );
          })
        ) : wallet ? (
          <div>No Transaction for this wallet</div>
        ) : (
          <div>Please connect your wallet using Metamask</div>
        )}
      </Transactions>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  border-top: 2px solid black;
`;

const RowRight = styled.div`
  display: flex;
  width: 100%;
  justify-content: flex-end;
  margin-bottom: 10px;
`;

const RefreshButton = styled.button`
  text-align: right;
  height: 40px;
  background: none;
  border: 2px solid #25283d;
  font-family: "Fjalla One", sans-serif;
  color: #25283d;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
`;

const Transactions = styled.div`
  margin: 20px 0;
`;

const Transaction = styled.div`
  border: 2px solid black;
  padding: 20px;
  margin: 10px 0;
`;

const Link = styled.a`
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
`;

export default TransactionHistory;