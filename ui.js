import { storeSelectedFilesOnBlockchain, extendContractOnBlockchain } from './contracts.js';
import { displayWallet } from './wallet.js';
import { decryptMessage } from "./encryption";
import {logout} from "./login";

// Function to handle the initial hash when the page loads
export function handleInitialHash() {
    const hash = window.location.hash;
    switch (hash) {
        case '#allContracts':
            displayAllContracts();
            break;
        case '#myFiles':
            displayMyFiles();
            break;
        default:
            // No default action, or you can add a default view if necessary
            break;
    }
}

// Function to fetch Hive balance
export function fetchHiveBalance(username) {
    const apiUrl = 'https://api.hive.blog';
    const requestBody = {
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1
    };

    fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.result && data.result.length > 0) {
                const balance = data.result[0].balance;
                document.getElementById('balance').innerText = balance;
            } else {
                document.getElementById('balance').innerText = '';
            }
        })
        .catch(error => {
            console.error('Error fetching Hive balance:', error);
            document.getElementById('balance').innerText = '';
        });
}

// Function to open the image in a modal for larger view
function openImageModal(imageUrl) {
    const imageModal = document.getElementById('imageModal');
    const imageModalContent = document.getElementById('imageModalContent');
    imageModalContent.src = imageUrl;
    imageModal.style.display = 'block';
}

// Event listener for image clicks to open the image modal
document.querySelector('.image-grid').addEventListener('click', function (event) {
    if (event.target.className === 'image-thumbnail') {
        openImageModal(event.target.src);
    }
});

// Function to display the image in a modal
function displayImageModal(imageSrc) {
    let modal = document.getElementById('imageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <img class="modal-image" src="">
            </div>
        `;
        document.body.appendChild(modal);

        const span = modal.getElementsByClassName("close")[0];
        span.onclick = function () {
            modal.style.display = "none";
        }
    }

    const modalImg = modal.getElementsByClassName('modal-image')[0];
    modalImg.src = imageSrc;
    modal.style.display = "block";
}

let decryptionQueue = [];
let isDecrypting = false;

function processDecryptionQueue() {
    if (decryptionQueue.length === 0) {
        isDecrypting = false;
        return;
    }

    isDecrypting = true;
    const { username, encryptedMessage, callback } = decryptionQueue.shift();
    decryptMessage(username, encryptedMessage, (error, decryptedMessage) => {
        callback(error, decryptedMessage);
        processDecryptionQueue();
    });
}


export function updateMyFiles() {
    const username = localStorage.getItem('hive_username');
    // Hive blockchain API endpoint
    const spkApiUrl = `https://spk.nathansenn.spk.tv/@${username}`;

    // Fetch additional user data from SPK API
    fetch(spkApiUrl)
        .then(response => response.json())
        .then(data => {
            // Handle the SPK API data
            // Extract and display the Broca balance
            if (data.broca) {
                const brocaBalance = data.broca.split(',')[0];
                document.getElementById('balance').innerText = `Broca: ${brocaBalance}`;
                document.getElementById('brocaBalance').innerText = `${brocaBalance} BROCA`;
            }
            // Extract and display the SPK Power balance
            if (data.spk_power) {
                const spkPowerBalance = data.spk_power;
                document.getElementById('spkPowerBalance').innerText = `${spkPowerBalance} SPK Power`;
            }
            // Extract and display the SPK balance
            if (data.spk) {
                const spkBalance = data.spk;
                document.getElementById('spkBalance').innerText = `${spkBalance} SPK`;
            }
            updateImagePlaceholders(data.file_contracts);
            // You can update the UI or perform other actions with the data here
        })
        .catch(error => {
            console.error('Error fetching data from SPK API:', error);
        });
}
// Function to determine file type from raw content
function getFileType(buffer) {
    const view = new DataView(buffer);

    if (view.getUint32(0, false) === 0x89504E47) { // "\x89PNG"
        return 'image/png';
    } else if (view.getUint16(0, false) === 0xFFD8) { // "\xFF\xD8"
        return 'image/jpeg';
    } else if (view.getUint32(0, false) === 0x47494638 || view.getUint32(0, false) === 0x47494639) { // "GIF87a" or "GIF89a"
        return 'image/gif';
    } else if (view.getUint32(0, false) === 0x52494646) { // "RIFF"
        return 'image/webp';
    } else if (view.getUint32(0, false) === 0x25504446) { // "%PDF"
        return 'application/pdf';
    } else if (view.getUint32(0, false) === 0x504B0304) { // "PK\x03\x04"
        return 'application/zip';
    } else if (view.getUint32(0, false) === 0x494433 || (view.getUint16(0, false) === 0xFFFB || view.getUint16(0, false) === 0xFFF3)) { // "ID3" or MP3
        return 'audio/mpeg';
    } else if (view.getUint32(0, false) === 0x4F676753) { // "OggS"
        return 'audio/ogg';
    } else if (view.getUint32(0, false) === 0x664C6143) { // "fLaC"
        return 'audio/flac';
    } else if ((view.getUint32(0, false) === 0x52494646) && (view.getUint32(8, false) === 0x57415645)) { // "RIFF....WAVE"
        return 'audio/wav';
    } else if (view.getUint16(0, false) === 0x1F8B) { // "\x1F\x8B"
        return 'application/gzip';
    } else if (view.getUint32(0, false) === 0x4D546864) { // "MThd"
        return 'audio/midi';
    } else if (view.getUint32(4, false) === 0x66747970) { // "ftyp"
        return 'video/mp4';
    } else if (view.getUint32(0, false) === 0x464C5601) { // "FLV"
        return 'video/x-flv';
    } else if (view.getUint32(0, false) === 0x4F676753 && view.getUint32(28, false) === 0x76696465) { // "OggS....video"
        return 'video/ogg';
    } else {
        console.log('Unknown file type:', buffer);
        return 'application/octet-stream'; // Default unknown binary data type
    }
}

// Function to update image placeholders with images from IPFS hashes
export async function updateImagePlaceholders(fileContracts) {
    const imageGrid = document.querySelector('.image-grid');
    imageGrid.innerHTML = '';

    for (const contractId in fileContracts) {
        const contract = fileContracts[contractId];
        if (contract.df) {
            for (const ipfsHash in contract.df) {
                const fileSize = contract.df[ipfsHash];
                const imageUrl = `https://ipfs.dlux.io/ipfs/${ipfsHash}`;
                const imageElement = document.createElement('div');
                imageElement.classList.add('image-placeholder');
                imageElement.innerHTML = `
                    <label class="image-checkbox-label">
                        <input type="checkbox" class="image-checkbox">
                        <span class="image-checkbox-custom"></span>
                    </label>
                    <img src="" class="image-thumbnail" />
                    <div class="image-title">${contractId}</div>
                    <button class="add-button">+</button>
                `;
                imageElement.dataset.contractId = contract.i;
                imageElement.dataset.fileSize = fileSize;

                fetch(`https://ipfs.dlux.io/ipfs/${ipfsHash}`)
                    .then(response => response.text())
                    .then(fileContent => {
                        // Handling encrypted files for logged in user
                        if (fileContent.startsWith('encrypted:') && contract.t === localStorage.getItem('hive_username')) {
                            // Log the initial part of the encrypted file content
                            console.log('Encrypted file:', fileContent.slice(0, 100) + '...');
                            let fileType = fileContent.slice(10, fileContent.indexOf('#'));
                            console.log('File type:', fileType);
                            let removedMetadata = fileContent.slice(fileContent.indexOf('#') + 1);
                            console.log(removedMetadata.slice(0, 100) + '...');
                            let parts = removedMetadata.split('#');
                            let hashCount = (fileContent.match(/#/g) || []).length;
                            console.log('Number of hashes:', hashCount);
                            let encryptedKey = parts[1];
                            let encryptedMessage = parts[2];
                            let encryptedMessageWithKey = '#'+ encryptedKey + '#' + encryptedMessage;
                            let fileName = hashCount === 4 ? parts[3] : null;
                            console.log('Encrypted key:', encryptedKey);
                            console.log('Encrypted message:', encryptedMessage);
                            console.log('Encrypted message with key:', encryptedMessageWithKey);
                            if (fileName) {
                                console.log('File name:', fileName);
                            } else {
                                console.log('File name is missing');
                            }
                            decryptionQueue.push({
                                username: localStorage.getItem('hive_username'),
                                encryptedMessage: encryptedMessageWithKey,
                                callback: (error, decryptedMessage) => {
                                    if (error) {
                                        console.error('Error decrypting message:', error);
                                    } else {
                                        console.log('Decrypted message:', decryptedMessage);

                                        const imageThumbnail = imageElement.querySelector('.image-thumbnail');
                                        const imageTitle = imageElement.querySelector('.image-title');
                                        console.log('imageThumbnail:', imageThumbnail);
                                        console.log('fileType:', fileType);
                                        if (fileType.startsWith('image/')) {
                                            console.log('File type is an image:', fileType);
                                            // convert the decrypted message from base64 to a blob
                                            // Decoding Base64 string
                                            const binaryString = window.atob(decryptedMessage);
                                            const len = binaryString.length;
                                            const bytes = new Uint8Array(len);

                                            for (let i = 0; i < len; i++) {
                                                bytes[i] = binaryString.charCodeAt(i);
                                            }

                                            // Creating the Blob from the typed array
                                            const imageBlob = new Blob([bytes], {type: fileType});

                                            imageThumbnail.src = URL.createObjectURL(imageBlob);
                                            // promt the user to download the decrypted image
                                            imageThumbnail.addEventListener('click', () => {
                                                const downloadLink = document.createElement('a');
                                                downloadLink.href = URL.createObjectURL(imageBlob);
                                                downloadLink.download = 'decrypted-image';
                                                downloadLink.click();
                                            });
                                        } else if(fileType.startsWith('video/')) {
                                            // Display a video player for MP4 files instead of an image inside the thumbnail
                                            imageThumbnail.style.display = 'none';
                                            const videoElement = document.createElement('video');
                                            // Creating the Blob from the typed array
                                            const binaryString = window.atob(decryptedMessage);
                                            const len = binaryString.length;
                                            const bytes = new Uint8Array(len);

                                            for (let i = 0; i < len; i++) {
                                                bytes[i] = binaryString.charCodeAt(i);
                                            }
                                            videoElement.src = URL.createObjectURL(new Blob([bytes], {type: fileType}));
                                            videoElement.controls = true;
                                            videoElement.style.width = '100%';
                                            videoElement.style.height = '100%';
                                            videoElement.style.objectFit = 'cover'; // Ensures the video covers the thumbnail without stretching
                                            imageThumbnail.parentNode.insertBefore(videoElement, imageThumbnail);
                                        }
                                        else {
                                            console.log('File type is not an image:', fileType);
                                            // If the file is not an image, display the file type
                                            imageThumbnail.style.display = 'none';
                                            imageTitle.textContent = `${fileName || 'Unknown file Name'}`;
                                        }
                                    }
                                }
                            });

                            if (!isDecrypting) {
                                processDecryptionQueue();
                            }
                        } else {
                            // Handling unencrypted files
                            fetch(`https://ipfs.dlux.io/ipfs/${ipfsHash}`)
                                .then(response => response.blob())
                                .then(blob => blob.arrayBuffer())
                                .then(arrayBuffer => {
                                    const fileType = getFileType(arrayBuffer);
                                    const imageThumbnail = imageElement.querySelector('.image-thumbnail');
                                    const imageTitle = imageElement.querySelector('.image-title');
                                    console.log('File type:', fileType);
                                    if (fileType.startsWith('image/')) {
                                        imageThumbnail.src = imageUrl;
                                    } else if (fileType.startsWith('video/mp4')) {
                                        // Display a video player for MP4 files instead of an image inside the thumbnail
                                        imageThumbnail.style.display = 'none';
                                        const videoElement = document.createElement('video');
                                        videoElement.src = imageUrl;
                                        videoElement.controls = true;
                                        videoElement.style.width = '100%';
                                        videoElement.style.height = '100%';
                                        videoElement.style.objectFit = 'cover'; // Ensures the video covers the thumbnail without stretching
                                        imageThumbnail.parentNode.insertBefore(videoElement, imageThumbnail);
                                    } else {
                                        console.log('File type:', fileType);
                                        imageThumbnail.style.display = 'none';
                                        imageTitle.textContent = `File type: ${fileType}`;
                                    }
                                })
                                .catch(error => {
                                    console.error('Error fetching file content from IPFS:', error);
                                });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching file content from IPFS:', error);
                    });

                addImageEventListeners(imageElement, imageUrl, contract);
                imageGrid.appendChild(imageElement);
            }
        }
    }
    updateCheckboxEventListeners();
}

// Function to add event listeners for image and button interactions
function addImageEventListeners(imageElement, imageUrl, contract) {
    imageElement.querySelector('.image-thumbnail').addEventListener('click', function () {
        displayImageModal(imageUrl);
    });

    imageElement.querySelector('.add-button').addEventListener('click', function (event) {
        event.stopPropagation();
        populateStorageNodes(contract.n);
        document.getElementById('extendStoreModal').style.display = 'block';
        document.getElementById('extendStoreModal').dataset.contractId = contract.i;
    });
}

// Function to populate storage nodes in the modal
function populateStorageNodes(storageNodes) {
    const storageNodesList = document.getElementById('storageNodesList');
    storageNodesList.innerHTML = '';
    Object.values(storageNodes).forEach(function (node) {
        const listItem = document.createElement('li');
        listItem.textContent = node;
        storageNodesList.appendChild(listItem);
    });
}

// Function to select or deselect all checkboxes
function toggleSelectAllCheckboxes() {
    const checkboxes = document.querySelectorAll('.image-checkbox');
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    checkboxes.forEach(checkbox => checkbox.checked = !allChecked);
    toggleStoreFilesButtonVisibility();
}

// Function to toggle the "Store Files" button visibility based on selected checkboxes
function toggleStoreFilesButtonVisibility() {
    const anyCheckboxSelected = Array.from(document.querySelectorAll('.image-checkbox')).some(checkbox => checkbox.checked);
    document.getElementById('storeFilesButton').style.display = anyCheckboxSelected ? 'inline-block' : 'none';
}

// Function to update event listeners for checkboxes
function updateCheckboxEventListeners() {
    document.querySelectorAll('.image-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', toggleStoreFilesButtonVisibility);
    });
}

// Function to open the Extend Duration Modal
function openExtendDurationModal() {
    var extendModal = document.getElementById('extendDurationModal');
    if (extendModal) {
        extendModal.style.display = 'block';
    } else {
        console.error('Extend Duration Modal not found');
    }
}

// Function to calculate and display the cost for the selected duration
function calculateExtendCost(fileSize) {
    const durationSelect = document.getElementById('extendDurationSelect');
    const duration = durationSelect.value;
    const costPer1024Bytes = 10;
    const cost = Math.ceil(fileSize / 1024) * costPer1024Bytes * duration;
    document.getElementById('extendCost').innerText = `Cost: ${cost} BROCA`;
    document.getElementById('extendDurationForm').setAttribute('data-duration', duration);
    document.getElementById('extendDurationForm').setAttribute('data-cost', cost);
}

// Function to display all contracts
export function displayAllContracts() {
    fetch('https://spk.nathansenn.spk.tv/feed')
        .then(response => response.json())
        .then(data => {
            const feed = data.feed;
            const filterToggle = document.getElementById('filterContractsToggle').checked;
            const filteredFeed = Object.entries(feed);

            const usernames = filteredFeed.map(([_, entry]) => {
                const match = entry.match(/@(\w+)/);
                return match ? match[1] : null;
            }).filter(Boolean);

            const uniqueUsernames = [...new Set(usernames)];
            const userPromises = uniqueUsernames.map(username => {
                return fetch(`https://spk.nathansenn.spk.tv/@${username}`)
                    .then(response => response.json())
                    .then(userData => {
                        const fileContracts = userData.file_contracts || {};
                        const filteredContracts = {};
                        for (const contractId in fileContracts) {
                            const contract = fileContracts[contractId];
                            if (filterToggle && Object.keys(contract.n).length < 3) {
                                filteredContracts[contractId] = contract;
                            } else if (!filterToggle) {
                                filteredContracts[contractId] = contract;
                            }
                        }
                        return filteredContracts;
                    })
                    .catch(error => {
                        console.error(`Error fetching contracts for user ${username}:`, error);
                        return {};
                    });
            });

            Promise.all(userPromises).then(allContracts => {
                const combinedContracts = Object.assign({}, ...allContracts);
                updateImagePlaceholders(combinedContracts);
            });
            document.querySelector('.image-grid').style.display = 'grid';
            document.getElementById('walletContent').style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching feed:', error);
        });
}

// Function to display the user's files
export function displayMyFiles() {
    if (username) {
        updateMyFiles();
        document.querySelector('.image-grid').style.display = 'grid';
        document.getElementById('walletContent').style.display = 'none';
    } else {
        window.location.hash = '#login';
    }
}

// Add event listener for the "Select All" button
document.getElementById('selectAllButton').addEventListener('click', toggleSelectAllCheckboxes);

// Add event listener for the "Store Selected Files" button
document.getElementById('storeFilesButton').addEventListener('click', storeSelectedFilesOnBlockchain);

// Add event listener for the "Extend" button
document.getElementById('extendButton').addEventListener('click', openExtendDurationModal);

// Add event listener for the "Extend" button to calculate cost when modal opens
document.getElementById('extendButton').addEventListener('click', function () {
    const extendModal = document.getElementById('extendStoreModal');
    const contractId = extendModal.dataset.contractId;
    const imageElement = document.querySelector(`.image-placeholder[data-contract-id="${contractId}"]`);
    const fileSize = imageElement ? parseInt(imageElement.dataset.fileSize, 10) : 0;
    calculateExtendCost(fileSize);
});

// Add event listener for changes to the duration select to recalculate cost
document.getElementById('extendDurationSelect').addEventListener('change', function () {
    const extendModal = document.getElementById('extendStoreModal');
    const contractId = extendModal.dataset.contractId;
    const imageElement = document.querySelector(`.image-placeholder[data-contract-id="${contractId}"]`);
    const fileSize = imageElement ? parseInt(imageElement.dataset.fileSize, 10) : 0;
    calculateExtendCost(fileSize);
});

document.getElementById('deleteFileButton').addEventListener('click', function() {
    const username = localStorage.getItem('hive_username');
    const extendModal = document.getElementById('extendStoreModal');
    const contractId = extendModal.dataset.contractId; // Retrieve the contract ID from the modal's data attribute

    if (username && contractId && window.hive_keychain) {
        const operations = [
            [
                "custom_json",
                {
                    "required_auths": [username],
                    "required_posting_auths": [],
                    "id": "spkccT_contract_close",
                    "json": JSON.stringify({
                        "id": contractId
                    })
                }
            ]
        ];
        window.hive_keychain.requestBroadcast(
            username,
            operations,
            'Active',
            function(response) {
                console.log('Delete operation broadcast response:', response);
                if (response.success) {
                    // Handle success, update UI accordingly
                    alert('Delete request successfully broadcasted to the blockchain.');
                } else {
                    // Handle error, update UI accordingly
                    alert('Failed to broadcast delete request: ' + response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or the contract ID is missing.');
    }
});

// Add event listener for the "Extend Contract" button
document.getElementById('extendContractButton').addEventListener('click', extendContractOnBlockchain);

// Add event listener for the filter toggle
document.getElementById('filterContractsToggle').addEventListener('change', displayAllContracts);

// Close the modal if the user clicks outside of it
window.onclick = function (event) {
    var extendModal = document.getElementById('extendDurationModal');
    var loginModal = document.getElementById('loginModal');
    var powerUpModal = document.getElementById('powerUpModal');
    if (event.target == extendModal) {
        extendModal.style.display = "none";
    } else if (event.target == loginModal) {
        loginModal.style.display = "none";
    } else if (event.target == powerUpModal) {
        powerUpModal.style.display = "none";
    }
}

// Add event listener for the "All Contracts" button
window.addEventListener('hashchange', handleHashChange);

// Function to handle hash changes in the URL
function handleHashChange() {
    const hash = window.location.hash;
    if (hash === '#allContracts') {
        displayAllContracts();
    } else if (hash === '#myFiles') {
        console.log('Displaying my files');
        displayMyFiles();
    } else if (hash === '#wallet') {
        displayWallet();
    }
}
