const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('EventStorage', function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('EventStorage')
    const contract = await factory.deploy()
    await contract.waitForDeployment()
    return { contract, owner, other }
  }

  it('creates events with sequential identifiers', async function () {
    const { contract, owner } = await deployFixture()

    const tx1 = await contract.connect(owner).createEvent('Aula 1', 'Introdução', 1700000000)
    const receipt1 = await tx1.wait()
    const event1 = receipt1.logs.find((log) => log.eventName === 'EventCreated')
    expect(event1.args.id).to.equal(1n)

    const tx2 = await contract.connect(owner).createEvent('Aula 2', 'Laboratório', 1700003600)
    const receipt2 = await tx2.wait()
    const event2 = receipt2.logs.find((log) => log.eventName === 'EventCreated')
    expect(event2.args.id).to.equal(2n)
  })

  it('stores events per owner', async function () {
    const { contract, owner, other } = await deployFixture()

    await contract.connect(owner).createEvent('Aula 1', 'Introdução', 1700000000)
    await contract.connect(owner).createEvent('Aula 2', 'Laboratório', 1700003600)
    await contract.connect(other).createEvent('Palestra', 'Convidado', 1700010000)

    const ownerEvents = await contract.getEventsByOwner(owner.address)
    expect(ownerEvents).to.have.lengthOf(2)
    expect(ownerEvents[0].title).to.equal('Aula 1')
    expect(ownerEvents[1].title).to.equal('Aula 2')

    const otherEvents = await contract.getEventsByOwner(other.address)
    expect(otherEvents).to.have.lengthOf(1)
    expect(otherEvents[0].title).to.equal('Palestra')
  })

  it('returns all events', async function () {
    const { contract, owner, other } = await deployFixture()

    await contract.connect(owner).createEvent('Aula 1', 'Introdução', 1700000000)
    await contract.connect(other).createEvent('Palestra', 'Convidado', 1700010000)

    const all = await contract.getAllEvents()
    expect(all).to.have.lengthOf(2)
    const titles = all.map((event) => event.title)
    expect(titles).to.include.members(['Aula 1', 'Palestra'])
  })
})
