import * as React from "react";

const FileCard = ({fileName, fileCID, style}) => {
    console.log(fileName); 
    console.log(fileCID)
    let fileUrl = "https://ipfs.io/ipfs/" + fileCID;
    return (
        <>
            <div className="card fileCard">
                <div className="card-header">
                    {fileName}
                </div>
                <ul className="list-group list-group-flush">
                    <a href={fileUrl}><li className="list-group-item">IPFS URL</li></a>
                </ul>
            </div>
        </>
        
    );
}

export default FileCard;