const {
  PrismaClient,
  PrismaClientValidationError,
  PrismaClientKnownRequestError,
  prismaVersion,
} = require('@prisma/client')
const assert = require('assert')

module.exports = async () => {
  const requests = []
  const prisma = new PrismaClient({
    errorFormat: 'colorless',
    __internal: {
      measurePerformance: true,
      hooks: {
        beforeRequest: request => requests.push(request),
      },
    },
  })

  if (!prismaVersion || !prismaVersion.client) {
    throw new Error(`prismaVersion missing: ${JSON.stringify(prismaVersion)}`)
  }

  // Test connecting and disconnecting all the time
  await prisma.user.findMany()
  prisma.disconnect()
  assert(requests.length === 1)

  await prisma.user.findMany()
  prisma.disconnect()
  assert(requests.length === 2)

  const count = await prisma.user.count()
  assert(typeof count === 'number')

  prisma.connect()
  await prisma.disconnect()

  await new Promise(r => setTimeout(r, 200))
  prisma.connect()

  const userPromise = prisma.user.findMany()
  await userPromise
  // @ts-ignore
  const perfResults = userPromise._collectTimestamps.getResults()
  if (Object.keys(perfResults).length === 0) {
    throw Error('measurePerformance is enabled but results object is empty')
  }

  await prisma.disconnect()

  await prisma.connect()

  // Test raw(string)
  const rawQuery = await prisma.raw('SELECT 1')
  if (rawQuery[0]['1'] !== 1) {
    throw Error("prisma.raw('SELECT 1') result should be [ { '1': 1 } ]")
  }

  // Test raw``
  const rawQueryTemplate = await prisma.raw `SELECT 1`
  if (rawQueryTemplate[0]['1'] !== 1) {
    throw Error("prisma.raw`SELECT 1` result should be [ { '1': 1 } ]")
  }

  // Test raw`` with ${param}
  const rawQueryTemplateWithParams = await prisma.raw `SELECT * FROM User WHERE name = ${'Alice'}`
  if (rawQueryTemplateWithParams[0].name !== 'Alice') {
    throw Error(
      "prisma.raw`SELECT * FROM User WHERE name = ${'Alice'}` result should be [{ email: 'a@a.de', id: '576eddf9-2434-421f-9a86-58bede16fd95', name: 'Alice' }]",
    )
  }

  // Test validation errors
  let validationError
  try {
    await prisma.post.create({
      data: {},
    })
  } catch (e) {
    validationError = e
  } finally {
    if (
      !validationError ||
      !(validationError instanceof PrismaClientValidationError)
    ) {
      throw new Error(`Validation error is incorrect`)
    }
  }

  // Test known request error
  let knownRequestError
  try {
    const result = await prisma.user.create({
      data: {
        email: 'a@a.de',
        name: 'Alice',
      },
    })
  } catch (e) {
    knownRequestError = e
  } finally {
    if (
      !knownRequestError ||
      !(knownRequestError instanceof PrismaClientKnownRequestError)
    ) {
      console.error(knownRequestError)
      throw new Error(`Known request error is incorrect`)
    } else {
      if (
        !knownRequestError.message.includes('Invalid `prisma.user.create()`')
      ) {
        throw new Error(`Invalid error: ${knownRequestError.message}`)
      }
    }
  }

  prisma.disconnect()
}

if (require.main === module) {
  module.exports()
}