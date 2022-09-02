import * as cdk from 'aws-cdk-lib'
import { Aws } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Parameters } from '../parameters'
import { IndoorEnvComponent } from './components/indoorenv'
import { Entities } from './entities'
import { Workspace } from './workspace'
import {things } from '../things'


export class StfDcTwinmakerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // CHANGE BUCKET NAME IF NOT DEFAULT USED FOR STF IOT DATALAKE
    const stf_iot_bucket_name = `stf-iot-datalake-${Aws.REGION}-${Aws.ACCOUNT_ID}`

    // CHANGE BUCKET NAME IF NOT DEFAULT USED FOR ATHENA OUTPUT RESULTS
    const athena_output_bucket_name = `stf-iot-datalake-${Aws.REGION}-${Aws.ACCOUNT_ID}-athena-results`

    // CHANGE IN PARAMETERS IF NOT DEFAULT USED
    const athena_db = Parameters.athena_database_name
    const athena_table = Parameters.athena_table_name

    // WORKSPACE 
    const workspace = new Workspace(this, 'Workspace', {
      workspace_name: Parameters.workspace_name
    })

    // INDOOR ENV COMPONENT 
    const component = new IndoorEnvComponent(this, 'IndoorEnvComponent', {
        stf_iot_bucket_name, 
        athena_output_bucket_name, 
        athena_db,
        athena_table,
        workspace_name: Parameters.workspace_name, 
        workspace_role_arn: workspace.workspace_role_arn
    })

    component.node.addDependency(workspace)

    // ENTITIES - SEE things.ts FILE

    const indoorEnventities = new Entities(this, 'IndoorEnvEntities', {
        things: things,
        workspace_name: Parameters.workspace_name,
        componentTypeId: component.componentTypeId
    })

    indoorEnventities.node.addDependency(workspace)
    indoorEnventities.node.addDependency(component)

  }
}
