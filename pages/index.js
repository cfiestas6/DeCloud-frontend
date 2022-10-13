import Head from "next/head";
import Web3Modal from "web3modal";
import { providers, Contract } from "ethers";
import React, { useEffect, useRef, useState } from "react";
import { abi, DECLOUD_CONTRACT_ADDRESS } from "../constants/index";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { FileUpload } from 'primereact/fileupload';
import { create } from "ipfs-http-client";
import FileCard from "../components/FileCard";

const INFURA_ID = process.env.NEXT_PUBLIC_INFURA_ID;
const INFURA_SECRET_KEY = process.env.NEXT_PUBLIC_INFURA_SECRET_KEY;

const auth =
    'Basic ' + Buffer.from(INFURA_ID + ':' + INFURA_SECRET_KEY).toString('base64');
const ipfs = create({
    host: 'infura-ipfs.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
});


export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [uploadClicked, setUploadClicked] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentFileName, setCurrentFileName] = useState("This should not be the name");
  const [currentFileBuffer, setCurrentFileBuffer] = useState();
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 80001) {
      window.alert("Change the network to Mumbai");
      throw new Error("Change network to Mumbai");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

   const captureFile = async (event) => {
    console.log(files);
    event.originalEvent.preventDefault();

    const file = await event.originalEvent.target.files[0];
    const reader = new window.FileReader();

    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
      setCurrentFileBuffer(Buffer(reader.result));
      setCurrentFileName(file.name)
    }
  }

  const uploadFile = async () => {
    console.log("Submitting file to IPFS...");
    setLoading(true);
    // Add file to the IPFS
    console.log(currentFileName);
    console.log(currentFileBuffer);
    const result = await ipfs.add(currentFileBuffer);
    const cid = result.cid;
    const stringCid = cid.toString();
    console.log(stringCid);
      /*Blockchain*/
    try {
      const signer = await getProviderOrSigner(true);
      const contract = new Contract(DECLOUD_CONTRACT_ADDRESS, abi, signer);
      console.log(contract.address);
      const tx = await contract.uploadFile(stringCid, currentFileName);
      await tx.wait();
      console.log("File uploaded to the blockchain succesfully!");
      
      getFiles();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }
  const getFiles = async () => {
    setFiles(files => []);
    setFilesLoading(true);
    const signer = await getProviderOrSigner(true);
    const contract = new Contract(DECLOUD_CONTRACT_ADDRESS, abi, signer);
    try {
      
      const filesLength = await contract.getNumFiles();

      for(let i = 0; i < filesLength; i++) {
        let [id, name, url] = await contract.files(i);
        let newFile = {
          id: id,
          name: name,
          url: url,
        }
        setFiles(files => [...files, newFile]);
      }
    } catch (err) {
      console.error(err);
    }
    setFilesLoading(false);
  }
  const getUserAddress = async () => {
    try {
    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    const stringAddress = await (address).toString();
    const slicedAddress = await stringAddress.slice(0, 10);
    setWalletAddress(slicedAddress);
    } catch(e) {
      consolo.error(e);
    }
  }
  const openUploadContainer = () => {
    if(!uploadClicked){
      if(walletConnected){
        setUploadClicked(true);
      } else {
        window.alert("Connect your wallet first!");
      }
    }
  }
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
      await getUserAddress();
      await getFiles();
    } catch (err) {
      console.error(err);
    }
  
  };
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {
          cacheProvider: false,
        },
        disableInjectedProvider: false,
      });
    }
  }, );
  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className="connect-button btn btn-light" >
          Connect your wallet
        </button>
      );
    } else if (walletConnected) {
      return (<button className="green-button connect-button btn btn-light" disabled>{walletAddress}...</button>);
    }
  }
  const upload = () => {
    if(!uploadClicked){
      if(!walletConnected) {
        return (
          <button disabled className="btn-lg upload-button btn btn-primary" onClick={openUploadContainer}>Upload File</button>
        );
      }
      return (
        <button className="btn-lg upload-button btn btn-primary" onClick={openUploadContainer}>Upload File</button>
      );
    } 
    if (uploadClicked) {
      return (
        <FileUpload maxFileSize={20000000} className={"upload-component"} uploadOptions={{className: "ui-upload-button"}} cancelOptions={{className: "ui-upload-button"}} chooseOptions={{className: "ui-upload-button"}} onSelect={captureFile} customUpload uploadHandler={uploadFile} />
      );
    }
  }

  return (
    <div>
      <Head>
        <title>DeCloud</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="description" content="DeCloud decentralized storage" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="navbar">
        <img className="logo" src="/logo.png" alt="logo"></img>
        <h1 className="navbar-title">DeCloud</h1>
        {renderButton()}
      </div>
      <div className="mega-container">
      <div className="main">
        
        <div className="text">
          <h1 className="title">Decentralize Cloud Service</h1>
          <div className="description">
            IPFS + Blockchain to keep your files save.
          </div>
        </div>
          {loading ? <div className="upload-container">Loading...</div> :
          <div className="upload-container">
            {upload()}
          </div>}
      </div>
      {walletConnected && 
        <div className="dashboard">
            <h3 className="file-section-title">My files:</h3>
            {filesLoading || files.length <= 0 ? <p>Loading...</p> : <div className="files-section">
            {files.map((file) => {
              return <FileCard fileName={file.name} fileCID={file.url} />
            })}
            </div>}
        </div>}
      
      </div>
      
      <footer className="footer">
        Made by 0xCarlosF
      </footer>
    </div>
  )
}