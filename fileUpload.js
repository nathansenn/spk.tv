import IPFS from 'ipfs-only-hash';
import { encryptMessage } from './encryption.js';
import { pollForNewChannels } from './contracts.js';
import { updateMyFiles } from './ui.js';
// Function to trigger file selection when the drop area is clicked
function triggerFileSelect() {
    const fileInput = document.getElementById('fileUpload');
    fileInput.click();
}

// Event listener to trigger file selection on click
document.getElementById('fileDropArea').addEventListener('click', triggerFileSelect);

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.getElementById('fileDropArea').addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    document.getElementById('fileDropArea').addEventListener(eventName, highlight, false);
});

// Unhighlight drop area when item is dragged out or dropped
['dragleave', 'drop'].forEach(eventName => {
    document.getElementById('fileDropArea').addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
document.getElementById('fileDropArea').addEventListener('drop', handleDrop, false);

// Prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area
function highlight(e) {
    document.getElementById('fileDropArea').classList.add('highlight');
}

// Unhighlight drop area
function unhighlight(e) {
    document.getElementById('fileDropArea').classList.remove('highlight');
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}

// Handle the files that are selected either via the file input or drag and drop
function handleFiles(files) {
    ([...files]).forEach(uploadFile);
    // Update the file input with the selected files
    const fileInput = document.getElementById('fileUpload');
    fileInput.files = files;
}

async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

document.getElementById('uploadFileButton').addEventListener('click', async function(event) {
    event.preventDefault(); // Prevent the default form submission
    const fileInput = document.getElementById('fileUpload');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
            uploadFile(file); // Call the uploadFile function with the selected file
    } else {
        alert('Please select a file to upload.');
    }
});

document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        file.arrayBuffer().then(arrayBuffer => {
            const buffer = new Uint8Array(arrayBuffer);
            IPFS.of([buffer]).then(ipfsHash => {
                event.target.setAttribute('data-ipfs-hash', ipfsHash); // Store the IPFS hash in a data attribute
                // Calculate the cost to store the file for 30 days
                const fileSize = file.size;
                const costPer1024Bytes = 10; // Cost per 1024 bytes
                const cost = Math.ceil(fileSize / 1024) * costPer1024Bytes; // Calculate the cost
                document.getElementById('newFileForm').setAttribute('data-cost', cost.toString()); // Store the cost in the form attribute
                // Display the file size and cost in the contract section of the upload modal
                const fileSizeDisplayElement = document.getElementById('fileSize');
                const costDisplayElement = document.getElementById('storageCost');
                const fileSizeFormatted = (fileSize / 1024).toFixed(2) + ' KB'; // Format file size to KB
                const costText = `Cost to store for 30 days: ${cost} BROCA`;
                const fileSizeText = `File size: ${fileSizeFormatted}`;
                if (!fileSizeDisplayElement) {
                    const fileSizeParagraph = document.createElement('p');
                    fileSizeParagraph.id = 'fileSize';
                    fileSizeParagraph.textContent = fileSizeText;
                    const contractSection = document.querySelector('.modal-step:nth-child(2)');
                    contractSection.appendChild(fileSizeParagraph);
                } else {
                    fileSizeDisplayElement.textContent = fileSizeText;
                }
                if (!costDisplayElement) {
                    const costParagraph = document.createElement('p');
                    costParagraph.id = 'storageCost';
                    costParagraph.textContent = costText;
                    const contractSection = document.querySelector('.modal-step:nth-child(2)');
                    contractSection.appendChild(costParagraph);
                } else {
                    costDisplayElement.textContent = costText;
                }
                // Display the selected file name in the drop area
                const dropArea = document.getElementById('fileDropArea');
                dropArea.querySelector('p').textContent = `Selected file: ${file.name}`;
            }).catch(error => {
                console.error('Error calculating IPFS hash:', error);
            });
        }).catch(error => {
            console.error('Error reading file buffer:', error);
        });
    }
});

export async function uploadFile(file) {
    console.log('Uploading file:', file);
    const username = localStorage.getItem('hive_username');
    const channelInput = document.querySelector('input[name="channelSelection"]:checked');
    // Check if the channel input is not null before trying to access its value
    const channelId = channelInput ? channelInput.value : null;
    const encryptCheckbox = document.getElementById('encryptCheckbox');

    let ipfsHash;

    if (encryptCheckbox.checked) {
        try {
            const fileContent = await convertToBase64(file);
            console.log('File content:', fileContent);
            encryptMessage(username, fileContent, async (err, encryptedMessage) => {
                if (err) {
                    alert('Encryption failed: ' + err);
                } else {
                    try {
                        encryptedMessage = 'encrypted:' + file.type + encryptedMessage +"#"+file.name; // Prefix the encrypted message with 'encrypted:
                        const encryptedFile = new Blob([encryptedMessage], { type: file.type });
                        console.log('Encrypted file:', encryptedFile);
                        ipfsHash = await IPFS.of([new Uint8Array(await encryptedFile.arrayBuffer())]);
                        console.log('IPFS hash of encrypted file:', ipfsHash);
                        signAndUploadFile(encryptedFile, username, channelId, ipfsHash);
                    } catch (error) {
                        console.error('Error generating IPFS hash for encrypted file:', error);
                        alert('Error generating IPFS hash for encrypted file: ' + error);
                    }
                }
            });
        } catch (error) {
            console.error('Error converting file to base64:', error);
        }
    } else {
        ipfsHash = await IPFS.of([new Uint8Array(await file.arrayBuffer())]);
        console.log('IPFS hash of file:', ipfsHash);
        signAndUploadFile(file, username, channelId, ipfsHash);
    }
}

function signAndUploadFile(file, username, channelId, ipfsHash) {
    const message = `${username}:${channelId},${ipfsHash}`;
    console.log('Signing message:', message);
    if (window.hive_keychain && typeof window.hive_keychain.requestSignBuffer === 'function') {
        console.log('Keychain is installed and available');
        window.hive_keychain.requestSignBuffer(
            username,
            message,
            'Posting',
            (response) => {
                console.log('Keychain response:', response);
                if (response.success && response.result) {
                    const signature = response.result;
                    // Only initiate file upload if channelId is not null
                    if (channelId) {
                        initiateFileUploadWithProgress(file, username, channelId, ipfsHash, signature);
                    } else {
                        console.error('No channel selected for file upload.');
                    }
                } else {
                    console.error('Error signing the message:', response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or not loaded properly');
    }
}

export function initiateFileUploadWithProgress(file, username, channelId, ipfsHash, signature) {
    let uploadStatusBar = document.getElementById('uploadStatusBar');
    let uploadProgress = document.getElementById('uploadProgress');
    let uploadStatusContainer = document.getElementById('uploadStatusContainer');
    if (!uploadStatusBar) {
        // Create the status bar element
        uploadStatusBar = document.createElement('div');
        uploadStatusBar.id = 'uploadStatusBar';
        // Optionally set classes or styles
        uploadStatusBar.classList.add('upload-status-bar');
        uploadStatusContainer.appendChild(uploadStatusBar); // Append to the status container in the modal
    }
    if (!uploadProgress) {
        // Create the progress bar element
        uploadProgress = document.createElement('div');
        uploadProgress.id = 'uploadProgress';
        // Optionally set classes or styles
        uploadProgress.classList.add('upload-progress-bar');
        uploadStatusBar.appendChild(uploadProgress); // Append to the status bar
    }
    // Ensure the status bar is visible
    uploadStatusBar.style.display = 'block';
    uploadProgress.style.width = '0%'; // Start with 0% width
    uploadProgress.textContent = '0%'; // Start with 0% text

    // Extract filename and extension
    const fullFileName = file.name;
    const lastDotIndex = fullFileName.lastIndexOf('.');
    const fileName = lastDotIndex !== -1 ? fullFileName.slice(0, lastDotIndex) : fullFileName;
    const fileExt = lastDotIndex !== -1 ? fullFileName.slice(lastDotIndex + 1) : '';

    const headersA = new Headers({
        'Content-Type': 'application/json',
        'X-Account': username,
        'X-Chain': "HIVE",
        'X-Cid': ipfsHash,
        'X-Contract': channelId,
        'X-Files': ',' + ipfsHash,
        'X-Sig': signature,
        'X-Meta': `,${fileName},${fileExt},,,`
    });
    const headersU = new Headers({
        'X-Account': username,
        'X-Cid': ipfsHash,
        'X-Contract': channelId,
        'X-Files': ',' + ipfsHash,
        'X-Sig': signature,
        'X-Meta': `,${fileName},${fileExt},,,`
    });

    fetch('https://ipfs.dlux.io/upload-authorize', {
        method: 'GET',
        headers: headersA
    })
        .then(response => response.json())
        .then(authData => {
            const formData = new FormData();
            formData.append('file', file);

            headersU.append('Content-Range', 'bytes=0-' + (file.size - 1) + '/' + file.size);
            return fetch('https://ipfs.dlux.io/upload', {
                method: 'POST',
                body: formData,
                headers: headersU
            }, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    uploadProgress.style.width = percentCompleted + '%';
                    uploadProgress.textContent = percentCompleted + '%';
                }
            });
        })
        .then(uploadData => {
            console.log('File uploaded successfully:', uploadData);
            uploadProgress.textContent = 'Upload complete!'; // Show upload complete message
            // wait for the file to be added to the blockchain
            setTimeout(() => {
                updateMyFiles();
            }, 5000);
        })
        .catch(error => {
            console.error('Error in file upload process:', error);
            uploadProgress.textContent = 'Upload failed'; // Show upload failed message
        });
}

document.getElementById('freeContractButton').addEventListener('click', function() {
    const fileInput = document.getElementById('fileUpload');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSizeInKB = Math.ceil(file.size / 1024);
        const username = localStorage.getItem('hive_username');
        if (window.hive_keychain && username) {
            const customJson = JSON.stringify({
                "kb": fileSizeInKB
            });
            window.hive_keychain.requestCustomJson(
                username,
                'SPK_TV_FREE_CONTRACT',
                'Active',
                customJson,
                'Free Contract',
                function(response) {
                    console.log('Hive Keychain response:', response);
                    if (response.success) {
                        alert('Free contract transaction successful!');
                        pollForNewChannels(username);
                    } else {
                        alert('Failed to create free contract: ' + response.message);
                    }
                }
            );
        } else {
            alert('Hive Keychain is not installed or no file is selected.');
        }
    } else {
        alert('Please select a file first.');
    }
});
