/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import * as vscode from 'vscode';
import { UserInputUtil } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';

export async function teardownFabricRuntime(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'teardownFabricRuntime');
    const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`All world state and ledger data for the Fabric runtime ${runtime.getName()} will be destroyed. Do you want to continue?`);
    if (!reallyDoIt) {
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Tearing down Fabric runtime ${runtime.getName()}` });

        const connectedGatewayRegistry: FabricGatewayRegistryEntry = FabricConnectionManager.instance().getGatewayRegistryEntry();
        if (connectedGatewayRegistry && connectedGatewayRegistry.managedRuntime) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
        }

        try {
            await runtime.teardown(outputAdapter);
            await runtime.deleteWalletsAndIdentities();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to teardown local_fabric: ${error.message}`, `Failed to teardown local_fabric: ${error.toString()}`);
        }
    });

    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
}
