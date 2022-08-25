export const IndoorEnvironmentObservedAthenaSchema = {
    type: {
        definition: { 
            dataType: { 
                type: "STRING" 
            },
            defaultValue: {
                "stringValue": "IndoorEnvironmentObserved"
            }, 
            isTimeSeries: false
        }
    },
    temperature: {
        definition: { 
            dataType: { 
                type: "DOUBLE",
                unitOfMeasure: "CEL"
            },
            isTimeSeries: true
        }
    },
    LAeq: {
        definition: { 
            dataType: { 
                type: "DOUBLE",
                unitOfMeasure: "dB"
            },
            isTimeSeries: true
        }
    },
    illuminance: {
        definition: { 
            dataType: { 
                type: "DOUBLE",
                unitOfMeasure: "LUX"
            },
            isTimeSeries: true
        }
    },
    relativehumidity: {
        definition: { 
            dataType: { 
                type: "DOUBLE",
                unitOfMeasure: "P1"
            },
            isTimeSeries: true
        }
    },
    co2: {
        definition: { 
            dataType: { 
                type: "DOUBLE",
                unitOfMeasure: "59"
            },
            isTimeSeries: true
        }
    }
}