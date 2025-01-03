/** @type {import('next').NextConfig} */
const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb' // Adjust this value as needed
    },
    responseLimit: '500mb'
  }
};

export default config; 