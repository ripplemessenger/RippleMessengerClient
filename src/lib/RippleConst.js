const MainNetURL = 'wss://xrplcluster.com'
const MainNetS1URL = 'wss://s1.ripple.com'
const MainNetS2URL = 'wss://s2.ripple.com'
const TestNetURL = 'wss://s.altnet.rippletest.net:51233'
const ServerOptions = [
  { value: MainNetURL, label: `Main Net: ${MainNetURL}` },
  { value: MainNetS1URL, label: `Main Net: ${MainNetS1URL}` },
  { value: MainNetS2URL, label: `Main Net: ${MainNetS2URL}` },
  { value: TestNetURL, label: `Test Net: ${TestNetURL}` }
]

export {
  MainNetURL,
  TestNetURL,
  ServerOptions,
}