const ENCRYPTION_KEY = 'your-encryption-key'; // You might want to move this to an environment variable

export const encryptData = (text: string): string => {
  try {
    // Simple XOR encryption (you might want to use a more secure method in production)
    const encrypted = text.split('').map(char => {
      return String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(0));
    }).join('');
    return btoa(encrypted); // Base64 encode the result
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

export const decryptData = (encryptedText: string): string => {
  try {
    const decoded = atob(encryptedText); // Base64 decode
    // Reverse the XOR operation
    return decoded.split('').map(char => {
      return String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(0));
    }).join('');
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}; 