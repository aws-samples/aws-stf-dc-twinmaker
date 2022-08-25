import { CfnEntity } from "aws-cdk-lib/aws-iottwinmaker"
import { Construct } from "constructs"

export interface EntitiesProps {
    things: Array<any>,
    workspace_name: string,
    componentTypeId: string
}

export class Entities extends Construct {

    constructor(scope: Construct, id: string, props: EntitiesProps){
        super(scope, id)

        const entities = props.things

        entities.forEach( thing => {
            
            let entityId = `urn:ngsi-ld:IndoorEnvironmentObserved:${thing.thingName}`

            new CfnEntity(this, `${thing.thingName}`, {
                entityName: `IndoorEnvironmentObserved-${thing.thingName}`, 
                workspaceId: props.workspace_name, 
                entityId: `${entityId}`,
                components: {
                    IndoorEnvironmentObservedComponent: {
                        componentTypeId: props.componentTypeId
                    }
                }
            })
        })



    }

  

}