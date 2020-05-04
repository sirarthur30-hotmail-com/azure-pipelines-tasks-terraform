import { IRunner, RunnerResult, RunnerOptions, IToolFactory } from ".";
import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import os from 'os';

export default class AzdoRunner implements IRunner {
    constructor(private readonly toolFactory: IToolFactory){ }

    private _processBuffers(buffers: Buffer[]): string {
        return buffers
            .map(data => {
                return data.toString();
            })
            .join(os.EOL)
            .toString();
    }

    async exec(options: RunnerOptions): Promise<RunnerResult> {
        const tool = this.toolFactory.create(options.tool);

        const stdOutBuffers: Buffer[] = [];
        const stdErrBuffers: Buffer[] = [];

        //buffer stdout writes so it can be set in result
        tool.on("stdout", (data: Buffer) => {
            stdOutBuffers.push(data);
        });

        //buffer stderr writes so it can be set in result
        tool.on("stderr", (data: Buffer) => {
            stdErrBuffers.push(data);
        }); 
        
        // add the groups & subgroups
        options.path.forEach(segment => {
            tool.arg(segment);
        })

        // add the path to the command, if any
        if(options.path.length > 0){
            tool.arg(options.path);
        }        

        // add the command itself
        tool.arg(options.command);
        
        // add the args for the command
        options.args.forEach(arg => {
            tool.arg(arg);
        });

        // add arbitrary user provided args string last
        if(options.argsLine){
            tool.line(options.argsLine);
        }

        const exitCode = await tool.exec(<IExecOptions>{
            cwd: options.cwd,
            ignoreReturnCode: true,
            silent: options.silent,
        });

        

        const stdout = this._processBuffers(stdOutBuffers);        
        const stderr = this._processBuffers(stdErrBuffers);

        return new RunnerResult(exitCode, stdout, stderr);
    }
}