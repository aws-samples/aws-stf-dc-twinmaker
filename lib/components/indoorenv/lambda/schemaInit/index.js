const IndoorEnvironmentObservedAthenaSchema = JSON.parse(process.env.IndoorEnvironmentObservedAthenaSchema)

exports.handler = async(event) => {
    console.log(JSON.stringify(event))
    let result = {
        properties: IndoorEnvironmentObservedAthenaSchema
    }

    return result
}