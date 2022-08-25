import { Aws } from "aws-cdk-lib"
import { AnyPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam"
import { CfnWorkspace } from "aws-cdk-lib/aws-iottwinmaker"
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3"
import { Construct } from "constructs"



export interface WorkspaceProps {
    workspace_name: string
}

export class Workspace extends Construct {
    public readonly workspace_role_arn: string
    public readonly workspace_bucket: Bucket
    constructor(scope: Construct, id: string, props: WorkspaceProps){
        super(scope, id)
        
        // TWINMAKER BUCKET 
        const workspaceBucket = new Bucket(this, 'BucketWorkspaceTwinMaker', {
            bucketName: `twinmaker-workspace-${props.workspace_name.toLowerCase()}-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
            cors: [
                {
                    allowedMethods: [
                        HttpMethods.GET,
                        HttpMethods.PUT, 
                        HttpMethods.POST, 
                        HttpMethods.DELETE,
                        HttpMethods.HEAD
                    ],
                    allowedHeaders: ['*'],
                    allowedOrigins: ['*']
                }
            ]
            
        })
        

        this.workspace_bucket = workspaceBucket
    
        workspaceBucket.addToResourcePolicy( new PolicyStatement({
            effect: Effect.DENY, 
            actions: ["s3:*"],
            principals: [new AnyPrincipal()],
            resources: [
                `${workspaceBucket.bucketArn}/*`,
                `${workspaceBucket.bucketArn}`,
            ],
            conditions: {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }

        }))

        // WORKSPACE POLICY 
        const workspacePolicy = new PolicyDocument({
            statements: [
              new PolicyStatement({
                resources: [`${workspaceBucket.bucketArn}/DO_NOT_DELETE_WORKSPACE_*`],
                actions: ["s3:DeleteObject"]
              }), 
              new PolicyStatement({
                resources: [`${workspaceBucket.bucketArn}/*`,`${workspaceBucket.bucketArn}`],
                actions: [  
                          "s3:GetBucket",
                          "s3:GetObject",
                          "s3:ListBucket",
                          "s3:PutObject",
                          "s3:ListObjects",
                          "s3:ListObjectsV2",
                          "s3:GetBucketLocation"
                          ]
              })
            ]
          })
        
        // WORKSPACE ROLE 
        const workspaceRole = new Role(this, 'RoleWorkspaceTwinMaker', {
            roleName: `twinmaker-workspace-${props.workspace_name.toLowerCase()}-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
            assumedBy: new ServicePrincipal('iottwinmaker.amazonaws.com'),
            inlinePolicies: {
              workSpacePolicy: workspacePolicy
            },
            description: `TwinMaker Workspace role created programmatically using CDK for the stack ${Aws.STACK_NAME}`
        })


        this.workspace_role_arn = workspaceRole.roleArn
        
        const cfnWorkspace = new CfnWorkspace(this, 'WorkspaceTwinMaker', {
            role: workspaceRole.roleArn,
            s3Location: workspaceBucket.bucketArn,
            workspaceId: props.workspace_name
        })

        cfnWorkspace.node.addDependency(workspaceRole)


    }
}