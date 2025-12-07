const { writeFileSync, mkdirSync } = require('fs')
const path = require('path')
const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying contracts with account:', deployer.address)

  const identityFactory = await hre.ethers.getContractFactory('IdentityRegistry')
  const identity = await identityFactory.deploy()
  await identity.waitForDeployment()
  console.log('IdentityRegistry deployed at', identity.target)

  const eventFactory = await hre.ethers.getContractFactory('EventStorage')
  const eventStorage = await eventFactory.deploy()
  await eventStorage.waitForDeployment()
  console.log('EventStorage deployed at', eventStorage.target)

  const network = await deployer.provider.getNetwork()
  const networkName = hre.network.name
  const deploymentsDir = path.join(__dirname, '..', 'deployments')
  mkdirSync(deploymentsDir, { recursive: true })

  const deployments = {
    network: networkName,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    IdentityRegistry: {
      address: identity.target,
      abi: identity.interface.formatJson(),
    },
    EventStorage: {
      address: eventStorage.target,
      abi: eventStorage.interface.formatJson(),
    },
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`)
  writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2))
  console.log('Deployment metadata saved to', deploymentFile)

  const clientContractsDir = path.join(__dirname, '..', '..', 'client', 'src', 'contracts')
  mkdirSync(clientContractsDir, { recursive: true })

  const clientDeployment = {
    network: deployments.network,
    chainId: deployments.chainId,
    deployedAt: deployments.deployedAt,
    identityRegistry: deployments.IdentityRegistry.address,
    eventStorage: deployments.EventStorage.address,
  }

  writeFileSync(
    path.join(clientContractsDir, 'IdentityRegistry.json'),
    JSON.stringify(
      {
        address: deployments.IdentityRegistry.address,
        abi: JSON.parse(deployments.IdentityRegistry.abi),
      },
      null,
      2
    )
  )

  writeFileSync(
    path.join(clientContractsDir, 'EventStorage.json'),
    JSON.stringify(
      {
        address: deployments.EventStorage.address,
        abi: JSON.parse(deployments.EventStorage.abi),
      },
      null,
      2
    )
  )

  writeFileSync(
    path.join(clientContractsDir, `deployments.${networkName}.json`),
    JSON.stringify(clientDeployment, null, 2)
  )

  writeFileSync(
    path.join(clientContractsDir, 'deployments.json'),
    JSON.stringify(clientDeployment, null, 2)
  )
  console.log('Client contract descriptors updated')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
