import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

export class ChattyAIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'ChattyAIVpc', {
      maxAzs: 3 // Default is all AZs in region
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'ChattyAICluster', {
      vpc: vpc
    });

    // RDS Database
    const database = new rds.DatabaseInstance(this, 'ChattyAIDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      vpc,
      credentials: rds.Credentials.fromGeneratedSecret('chattyai'),
      multiAz: true,
      allocatedStorage: 100,
      maxAllocatedStorage: 200,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
    });

    // ECS Fargate Service
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ChattyAIFargateService', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
        environment: {
          DATABASE_URL: database.instanceEndpoint.socketAddress
        }
      },
      publicLoadBalancer: true
    });

    // Grant ECS service access to the database
    database.connections.allowFrom(fargateService.service, ec2.Port.tcp(5432));

    // Output the load balancer DNS
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName
    });
  }
} 