import { ipcMain } from 'electron';
import path from 'path';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { UtilsService } from '../services/utils.service';
import { BSVersion } from 'main/services/bs-version-manager.service';


export interface InitDownloadInfoInterface {
  cwd: string ,
  folder: string,
  app: string,
  depot: string,
  manifest: string,
  username: string,
  stay: boolean
}

export interface DownloadInfo {
  bsVersion: BSVersion,
  username: string,
  password?: string,
  stay?: boolean
}

const DEPOT_DOWNLOADER_EXE = 'DepotDownloader.exe';

let PROCESS: ChildProcessWithoutNullStreams;

ipcMain.on('bs-download.start', async (event, args: DownloadInfo) => {
  console.log(args); return;
  const DEPOT_DOWNLOADER_PATH = path.join(UtilsService.getInstance().getAssetsPath(), 'depot-downloader', DEPOT_DOWNLOADER_EXE);
  console.log(UtilsService.getInstance().getAssetsPath());
  console.log(DEPOT_DOWNLOADER_PATH);
  console.log(args.cwd);
  UtilsService.getInstance().createFolderIfNotExist(args.cwd);
  PROCESS = spawn(DEPOT_DOWNLOADER_PATH, [`-app ${args.app}`, `-depot ${args.depot}`, `-manifest ${args.manifest}`, `-username ${args.username}`, `-dir ${args.folder}`, args.stay ? `-remember-password` : ''], {shell: true, cwd: args.cwd});

  PROCESS.stdout.on('data', data => {

    const out: string[] = data.toString().split('|');
    console.log(out);

    if(out[0] === "[Progress]"){ event.reply('bs-download.progress', out[1]); }
    else if(out[0] === "[Password]"){ event.reply('bs-download.not-connected', args.bsVersion); PROCESS.kill(); }
    else if(out[0] === "[2FA]"){ event.reply('bs-download.ask-2fa'); }
    else if(out[0] === "[Guard]"){ event.reply('bs-download.ask-guard'); }
    else if(out[0] === "[Error]"){ event.reply('bs-download.error', out); }

  });

  PROCESS.stderr.on('data', (data) => {console.log(data.toString())});
});

ipcMain.on('bs-download.enter-password', async (event, value: string) => {
    if(PROCESS){ PROCESS.stdin.write(`${value}\n`); }
});
