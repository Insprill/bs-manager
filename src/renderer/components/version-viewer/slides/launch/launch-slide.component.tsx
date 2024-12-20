import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { BsmButton } from "renderer/components/shared/bsm-button.component";
import { useObservable } from "renderer/hooks/use-observable.hook";
import { useTranslationV2 } from "renderer/hooks/use-translation.hook";
import { BSLauncherService, LaunchMods } from "renderer/services/bs-launcher.service";
import { ConfigurationService } from "renderer/services/configuration.service";
import { BSVersion } from "shared/bs-version.interface";
import { LaunchModToogle } from "./launch-mod-toogle.component";
import BSLogo from "../../../../../../assets/images/apngs/bs-logo.png";
import { BsmImage } from "renderer/components/shared/bsm-image.component";
import { useService } from "renderer/hooks/use-service.hook";
import { BsStore } from "shared/models/bs-store.enum";
import { lastValueFrom } from "rxjs";
import { BsDownloaderService } from "renderer/services/bs-version-download/bs-downloader.service";
import equal from "fast-deep-equal";
import { GlowEffect } from "renderer/components/shared/glow-effect.component";
import { cn } from "renderer/helpers/css-class.helpers";
import { BSVersionManagerService } from "renderer/services/bs-version-manager.service";
import { safeLt } from "shared/helpers/semver.helpers";
import { WarningIcon } from "renderer/components/svgs/icons/warning-icon.component";
import Tippy from "@tippyjs/react";

type Props = { version: BSVersion };

export function LaunchSlide({ version }: Props) {
    const { text: t, element: te } = useTranslationV2();

    const configService = useService(ConfigurationService);
    const bsLauncherService = useService(BSLauncherService);
    const bsDownloader = useService(BsDownloaderService);
    const versions = useService(BSVersionManagerService);

    const [oculusMode, setOculusMode] = useState(!!configService.get<boolean>(LaunchMods.OCULUS_MOD));
    const [desktopMode, setDesktopMode] = useState(!!configService.get<boolean>(LaunchMods.DESKTOP_MOD));
    const [debugMode, setDebugMode] = useState(!!configService.get<boolean>(LaunchMods.DEBUG_MOD));
    const [advancedLaunch, setAdvancedLaunch] = useState(false);
    const [additionalArgsString, setAdditionalArgsString] = useState<string>(configService.get<string>("additionnal-args") || "");
    const versionDownloading = useObservable(() => bsDownloader.downloadingVersion$);

    const versionRunning = useObservable(() => bsLauncherService.versionRunning$);

    useEffect(() => {
        configService.set("additionnal-args", additionalArgsString);
    }, [additionalArgsString]);

    useEffect(() => {
        if(desktopMode){ return; }
        bsLauncherService.restoreSteamVR();
    }, [desktopMode]);

    const setMode = (mode: LaunchMods, value: boolean) => {

        if (mode === LaunchMods.DEBUG_MOD) {
            setDebugMode(value);
        } else if (mode === LaunchMods.OCULUS_MOD) {
            setOculusMode(value);
        } else if (mode === LaunchMods.DESKTOP_MOD) {
            setDesktopMode(value);
        }
        configService.set(mode, value);
    };

    const handleAdditionalArgsChange = (e: ChangeEvent<HTMLInputElement>) => setAdditionalArgsString(() => e.target.value);

    const launch = () => {
        const additionalArgs = additionalArgsString?.split(";").map(arg => arg.trim()).filter(arg => arg.length > 0);

        const launch$ = bsLauncherService.launch({
            version,
            oculus: version.oculus ? false : oculusMode,
            desktop: desktopMode,
            debug: debugMode,
            additionalArgs: advancedLaunch ? additionalArgs : [],
        });

        return lastValueFrom(launch$).catch(() => {});
    };

    const isOutdated = useMemo(() => {
        return safeLt(version?.BSVersion, versions.getRecommendedVersion()?.BSVersion);
    }, [version]);

    return (
        <div className="w-full shrink-0 items-center relative flex flex-col justify-start">
            <div className="flex flex-col gap-3 justify-center items-center mb-5">
                <BsmImage className="relative object-cover h-28" image={BSLogo} />
                <h1 className="relative text-4xl font-bold italic -top-3">
                    {version.name ? `${version.BSVersion} - ${version.name}` : version.BSVersion}
                    {isOutdated && (
                        <Tippy theme="default" content={te("pages.version-viewer.launch-mods.outdated-tippy", { recommendedVersion: <b>{versions.getRecommendedVersion().BSVersion}</b> })}>
                            <span className="absolute bg-theme-1 size-7 rounded-full p-1.5 flex justify-center items-center -right-2 top-2 translate-x-full translate-y-px cursor-help">
                                <WarningIcon className="text-warning-400 animate-pulse"/>
                            </span>
                        </Tippy>
                    )}
                </h1>
            </div>
            <div className="grid grid-flow-col gap-6">
                {!(version.oculus || version.metadata?.store === BsStore.OCULUS) && <LaunchModToogle infoText="pages.version-viewer.launch-mods.oculus-description" icon="oculus" onClick={() => setMode(LaunchMods.OCULUS_MOD, !oculusMode)} active={oculusMode} text="pages.version-viewer.launch-mods.oculus" />}
                <LaunchModToogle infoText="pages.version-viewer.launch-mods.desktop-description" icon="desktop" onClick={() => setMode(LaunchMods.DESKTOP_MOD, !desktopMode)} active={desktopMode} text="pages.version-viewer.launch-mods.desktop" />
                <LaunchModToogle infoText="pages.version-viewer.launch-mods.debug-description" icon="terminal" onClick={() => setMode(LaunchMods.DEBUG_MOD, !debugMode)} active={debugMode} text="pages.version-viewer.launch-mods.debug" />
            </div>
            <div className="pt-4 w-2/3 flex flex-col items-center gap-3">
                <div className="relative">
                    <GlowEffect className="!rounded-full" visible={!!(advancedLaunch && additionalArgsString)}/>
                    <BsmButton
                        className={cn("rounded-full w-fit text-lg py-1 px-7 bg-theme-2 text-gray-800 dark:text-white", (advancedLaunch && additionalArgsString) ? "" : "shadow-md shadow-black")}
                        text="pages.version-viewer.launch-mods.advanced-launch.button"
                        withBar={false}
                        onClick={e => {
                            e.preventDefault();
                            setAdvancedLaunch(prev => !prev);
                        }}
                    />
                </div>
                <div className="bg-light-main-color-2 dark:bg-main-color-2 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all duration-100 ease-in-out w-full origin-top shadow-black shadow-sm" style={{ scale: advancedLaunch ? "100% 100%" : "0 0" }}>
                    <input className="w-[calc(100%-12px)] h-[calc(100%-12px)] bg-light-main-color-1 dark:bg-main-color-1 text-black dark:text-white rounded-full outline-none text-center" type="text" placeholder={t("pages.version-viewer.launch-mods.advanced-launch.placeholder")} value={additionalArgsString} onChange={handleAdditionalArgsChange} />
                </div>
            </div>
            <div className='grow flex justify-center items-center'>
                <BsmButton
                    onClick={launch}
                    active={JSON.stringify(version) === JSON.stringify(versionRunning)}
                    className='relative -translate-y-1/2 text-5xl text-gray-800 dark:text-gray-200 font-bold tracking-wide pt-1 pb-3 px-7 rounded-lg shadow-md italic shadow-black active:scale-90 transition-transform'
                    text="misc.launch"
                    disabled={equal(version, versionDownloading)}
                />
            </div>
        </div>
    );
}


