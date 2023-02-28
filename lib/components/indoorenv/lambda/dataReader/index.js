require('util').inspect.defaultOptions.depth = null
const aws = require('aws-sdk')
const athena = new aws.Athena()
const ATHENA_DB = process.env.ATHENA_DB
const ATHENA_TABLE = process.env.ATHENA_TABLE
const ATHENA_OUTPUT = process.env.ATHENA_OUTPUT
const ATHENA_WORKGROUP = process.env.ATHENA_WORKGROUP

exports.handler = async (event) => {
    try {

        let req = (event.selectedProperties.reduce((prev, curr) => {
            console.log(curr)
                return prev += `json_extract_scalar(${curr}, '$.value') as ${curr},` 
        }, '').trim()).slice(0, -1)

        console.log(req)

        const {QueryExecutionId} = await athena.startQueryExecution({
            QueryString: `
                            SELECT 
                                json_extract_scalar(dateObserved, '$.value') as dateObserved,
                                ${req}
                            FROM "${ATHENA_DB}"."${ATHENA_TABLE}" 
                            WHERE type='IndoorEnvironmentObserved' 
                            AND dt between '${event.startTime.substring(0,4)}-${event.startTime.substring(5,7)}-${event.startTime.substring(8,10)}-${event.startTime.substring(11,13)}' 
                                AND '${event.endTime.substring(0,4)}-${event.endTime.substring(5,7)}-${event.endTime.substring(8,10)}-${event.endTime.substring(11,13)}' 
                            AND id='${event.entityId}' 
                            AND json_extract_scalar(dateObserved, '$.value') between '${event.startTime}' and  '${event.endTime}'
                            ORDER BY dateObserved DESC`,
            QueryExecutionContext: {
                Database: ATHENA_DB
            },
            WorkGroup: ATHENA_WORKGROUP,
            ResultConfiguration: {
                OutputLocation: ATHENA_OUTPUT
            }
        }).promise()
        
        let status = "QUEUED"
        
        while (status == "QUEUED" || status == "RUNNING"){
            const { QueryExecution, QueryExecution : {Status : { State}}} = await athena.getQueryExecution({
                QueryExecutionId
            }).promise()
            console.log(QueryExecution)
            status = State
            console.log(status)
            if( status == 'FAILED' || status == 'CANCELLED') {
                throw new Error(`Athena Query ${QueryExecutionId} has the status ${status}`)
            }
            await delay(1000) 
        }

        const {UpdateCount, ResultSet, ResultSet : { Rows}} = await athena.getQueryResults({
            QueryExecutionId
        }).promise()
        let properties = Rows[0]['Data'].reduce((prev, curr) => {
            return [...Object.values(prev), ...Object.values(curr)]
        }, [])
        let values = Rows.slice(1)

        let js_results = []
        let res = []
        let results = { propertyValues: [] }


        values.forEach( ({Data}) => {
            let entity = {}

            Data.forEach( (value, index) => {
                // console.log(value)
                try {
                    entity[properties[index]] = JSON.parse(JSON.stringify(value.VarCharValue)) 
                } catch (e) {
                    entity[properties[index]] = value.VarCharValue 
                }
                
            })
            js_results.push(entity)
        })


        js_results.forEach(item => {
            properties.forEach(prop => {
                if(prop == "dateObserved") return
                if(!res[prop]){
                    res[prop] = {
                        entityPropertyReference:{
                            propertyName: prop,
                            componentName: event.componentName,
                            entityId: event.entityId
                        },
                        values: []
                    }
                }
                res[prop].values.push({
                    time:  item.dateObserved,
                    value: {doubleValue: item[prop]}
                })
            })  
        })

        for (let key in res){
            results.propertyValues.push(res[key])
        }
    
        console.log(results)

        return results
    
    } catch (e) {
        console.log(e)
    }


 
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

