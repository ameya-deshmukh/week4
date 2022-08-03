import detectEthereumProvider from "@metamask/detect-provider";
import { Strategy, ZkIdentity } from "@zk-kit/identity";
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols";
import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React from "react";
import styles from "../styles/Home.module.css";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextField, Button, Typography, Stack } from "@mui/material";
import { abi as GREETER_ABI } from "artifacts/contracts/Greeters.sol/Greeters.json";

type Inputs={
 name: string;
 address: string;
 age: number;
}

const schema = yup
.object({
        name: yup.string().required("Please enter your name"),
            age: yup
            .number()
            .typeError("Age should be a number")
            .positive("Age should be positive")
            .integer("Age should be an integer")
            .required("Please enter your age"),
            address: yup
            .string()
            .matches(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
            .required("Please enter your Ethereum address"),
        })
        .required();

 const { handleSubmit, control } = useForm<Inputs>({
            resolver: yupResolver(schema),
});

const [greeting, setGreeting] = React.useState("");
const [logs, setLogs] = React.useState("Connect wallet and greet");

const listen = async () => {
    try {
      const ethProvider = (await detectEthereumProvider()) as any;

      await ethProvider.request({ method: "eth_requestAccounts" });

      const ethersProvider = new providers.Web3Provider(ethProvider);
      const contract = new Contract(
        "0xeC4BbAF888B17F1038b9BBc1221f3cFF0d49e817",
        GREETER_ABI,
        ethersProvider
      );
      contract.on("NewGreeting", (greeting: string) => {
        console.log(utils.parseBytes32String(greeting));
        setGreeting(utils.parseBytes32String(greeting));
      });
    } catch (err) {
      console.log("Failed to listen");
      console.error(err);
    };

React.useEffect(() => {
    listen();
    }, []);

async function greet() {
        setLogs("Creating Semaphore proof...");
    
        const provider = (await detectEthereumProvider()) as any;
    
        await provider.request({ method: "eth_requestAccounts" });
    
        const ethersProvider = new providers.Web3Provider(provider);
        
        const signer = ethersProvider.getSigner();
        
        const message = await signer.signMessage(
          "Sign this message!"
        );
    
        const identity = new ZkIdentity(Strategy.MESSAGE, message);

        const identityCommitment = identity.genIdentityCommitment();

        const identityCommitments = await (
          await fetch("./identityCommitments.json")
        ).json();
    
        const merkleProof = generateMerkleProof(
          20,
          BigInt(0),
          identityCommitments,
          identityCommitment
        );
    
        setLogs("Creating Semaphore proof");
    
        const greeting = "Welcome to ZKU Cohort 4!";
    
        const witness = Semaphore.genWitness(
          identity.getTrapdoor(),
          identity.getNullifier(),
          merkleProof,
          merkleProof.root,
          greeting
        );
    
        const { proof, publicSignals } = await Semaphore.genProof(
          witness,
          "./semaphore.wasm",
          "./semaphore_final.zkey"
        );
        const solidityProof = Semaphore.packToSolidityProof(proof);
    
        const response = await fetch("/api/greet", {
          method: "POST",
          body: JSON.stringify({
            greeting,
            nullifierHash: publicSignals.nullifierHash,
            solidityProof: solidityProof,
          }),
        });
    
        if (response.status === 500) {
          const errorMessage = await response.text();
    
          setLogs(errorMessage);
        } else {
          setLogs("Your greeting is onchain!");
        }
      }
      const onSubmit = (data: Inputs) => {
        console.log(data);
      };

return (
        <div className={styles.container}>
            <Head>
                <title>Greetings</title>
                <meta name="description" content="A simple Next.js/Hardhat privacy application with Semaphore." />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>Greetings</h1>

                <p className={styles.description}>A simple Next.js/Hardhat privacy application with Semaphore.</p>

                <div className={styles.logs}>{logs}</div>
                <Typography> {greeting} </Typography>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Controller
                        name="name"
                        control={control}
                        defaultValue=""
                        rules={{ required: "Name is required" }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            fullWidth
                            label="Name"
                            variant="filled"
                            value={value}
                            onChange={onChange}
                            error={!!error}
                            helperText={error ? error.message : null}
                        />
                        )}
                    />
                    <Controller
                        name="age"
                        control={control}
                        defaultValue={18}
                        rules={{ required: "Age is required" }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            fullWidth
                            label="Age"
                            variant="filled"
                            value={value}
                            onChange={onChange}
                            error={!!error}
                            helperText={error ? error.message : null}
                        />
                        )}
                    />
                    <Controller
                        name="address"
                        control={control}
                        defaultValue=""
                        rules={{ required: "Address is required" }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            fullWidth
                            label="Address"
                            variant="filled"
                            value={value}
                            onChange={onChange}
                            error={!!error}
                            helperText={error ? error.message : null}
                        />
                        )}
                    />
                    <Button variant="contained" type="submit" color="primary">
                        Submit
                    </Button>
                 </form>

                <div 
                    onClick={() =>{ 
                        greet();
                    }}
                    className={styles.button}>
                    Greet
                </div>
            </main>
        </div>
);
 }