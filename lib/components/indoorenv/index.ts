import { Aws, Duration } from "aws-cdk-lib"
import { Policy, PolicyStatement, Role } from "aws-cdk-lib/aws-iam"
import { CfnComponentType } from "aws-cdk-lib/aws-iottwinmaker"
import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { Construct } from "constructs"
import { Parameters } from "../../../parameters"
import {IndoorEnvironmentObservedAthenaSchema} from '../../../schema'

export interface IndoorEnvComponentProps {
    stf_iot_bucket_name: string,
    athena_db: string, 
    athena_table: string, 
    athena_output_bucket_name: string,
    workspace_role_arn: string
    workspace_name: string
}

export class IndoorEnvComponent extends Construct {

    public readonly componentTypeId : string

    constructor(scope: Construct, id: string, props: IndoorEnvComponentProps){
        super(scope, id)
        
        const athena_output_bucket = Bucket.fromBucketName(this, 'AthenaOutputBucket', props.athena_output_bucket_name)
        const stf_iot_bucket = Bucket.fromBucketName(this, 'StfIotBucket', props.stf_iot_bucket_name)
        
        // LAMBDA FOR SCHEMA INIT
        const lambda_schema_init_path = `${__dirname}/lambda/schemaInit`
        const lambda_schema_init = new Function(this, 'SchemaInit', {
            runtime: Runtime.NODEJS_16_X,
            code: Code.fromAsset(lambda_schema_init_path),
            handler: 'index.handler',
            timeout: Duration.seconds(10),
            environment: {
                IndoorEnvironmentObservedAthenaSchema: JSON.stringify(IndoorEnvironmentObservedAthenaSchema)
            }
        })

        // LAMBDA FOR DATA READER CONNECTOR 
        const lambda_data_reader_path = `${__dirname}/lambda/dataReader`
        const lambda_data_reader = new Function(this, 'DataReader', {
            runtime: Runtime.NODEJS_16_X,
            code: Code.fromAsset(lambda_data_reader_path),
            handler: 'index.handler',
            timeout: Duration.seconds(60),
            environment: {
                ATHENA_DB: props.athena_db,
                ATHENA_TABLE: props.athena_table, 
                ATHENA_OUTPUT: `${athena_output_bucket.s3UrlForObject()}`,
                ATHENA_WORKGROUP: Parameters.athenaworkgroup
            }
        })
        
        lambda_data_reader.addToRolePolicy(new PolicyStatement({
            actions: [
                "athena:StartQueryExecution",
                "athena:GetQueryExecution",
                "athena:GetQueryResults",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:PutObject",
                "glue:GetTable",
                "glue:GetPartitions",
                "glue:GetPartition"
            ],
            resources: [
                `arn:aws:athena:${Aws.REGION}:${Aws.ACCOUNT_ID}:workgroup/*`,
                `${athena_output_bucket.bucketArn}`,
                `${athena_output_bucket.bucketArn}/*`,
                `${stf_iot_bucket.bucketArn}`,
                `${stf_iot_bucket.bucketArn}/*`,
                `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`,
                `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/*`,
                `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/*`,
            ]
        }))

        // WORKSPACE ROLE 
        const workspace_role = Role.fromRoleArn(this, 'WorkspaceRole', props.workspace_role_arn)

        const policy = new Policy(this, 'PolicySchemaInit', {
            statements: [
                new PolicyStatement({
                    actions: [
                        'lambda:invokeFunction'
                    ],
                    resources: [
                        lambda_schema_init.functionArn,
                        lambda_data_reader.functionArn

                    ]
                })
            ]
        })

        workspace_role.attachInlinePolicy(policy)

        const component = new CfnComponentType(this, 'TwinMakerComponentIndoorEnv', {
            componentTypeId: `com.stf.IndoorEnvironmentObserved`,
            workspaceId: props.workspace_name,
            functions: {
                "schemaInitializer": {
                    implementedBy: {
                        lambda: {
                            arn: lambda_schema_init.functionArn
                        }
                    }
                },
                "dataReader": {
                    implementedBy: {
                        lambda: {
                            arn: lambda_data_reader.functionArn
                        }
                    }
                }
            }
        })

        this.componentTypeId = component.componentTypeId


    }

 


}