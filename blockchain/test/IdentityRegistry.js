const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('IdentityRegistry', function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('IdentityRegistry')
    const contract = await factory.deploy()
    await contract.waitForDeployment()
    return { contract, owner, other }
  }

  it('registers a new identity and prevents duplicates', async function () {
    const { contract, owner, other } = await deployFixture()

    await expect(contract.connect(owner).registerIdentity('Alice', '2023001', 'Redes'))
      .to.emit(contract, 'IdentityRegistered')
      .withArgs(owner.address, '2023001', 'Alice')

    const [, exists] = await contract.getIdentity(owner.address)
    expect(exists).to.be.true

    await expect(contract.connect(owner).registerIdentity('Alice', '2023001', 'Redes')).to.be.revertedWithCustomError(
      contract,
      'IdentityAlreadyExists'
    )

    await expect(contract.connect(other).registerIdentity('Bob', '2023001', 'Redes')).to.be.revertedWithCustomError(
      contract,
      'MatriculaAlreadyInUse'
    )
  })

  it('updates identity metadata', async function () {
    const { contract, owner } = await deployFixture()

    await contract.connect(owner).registerIdentity('Alice', '2023001', 'Redes')
    await expect(contract.connect(owner).updateIdentity('Alice B.', 'Cibersegurança'))
      .to.emit(contract, 'IdentityUpdated')
      .withArgs(owner.address, '2023001', 'Alice B.')

    const [info] = await contract.getIdentity(owner.address)
    expect(info.name).to.equal('Alice B.')
    expect(info.curso).to.equal('Cibersegurança')
  })

  it('lists all identities', async function () {
    const { contract, owner, other } = await deployFixture()

    await contract.connect(owner).registerIdentity('Alice', '2023001', 'Redes')
    await contract.connect(other).registerIdentity('Bob', '2023002', 'Computação')

    const list = await contract.getAllIdentities()
    expect(list).to.have.lengthOf(2)
    const names = list.map((item) => item.name)
    expect(names).to.include.members(['Alice', 'Bob'])
  })
})
