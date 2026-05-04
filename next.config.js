module.exports = {
  //...
  async rewrites() {
    return [
      {
        source: '/_dnscheck',
        destination: 'https://dns.google.com/resolve?name=royaltycalculator.app&type=NS',
      },
    ];
  },
};