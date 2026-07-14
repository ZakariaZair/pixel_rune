const fs = require('fs');
const path = require('path');

const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

const DEFAULT_WIDGET_TARGET_NAME = 'PixelRuneWidget';
const DEFAULT_WIDGET_DISPLAY_NAME = 'Pixel Rune';
const DEFAULT_WIDGET_DESCRIPTION = 'Displays your active Rune.';
const BRIDGE_GROUP_NAME = 'PixelRuneWidgetBridge';

function withPixelRuneWidget(config, props = {}) {
  const bundleIdentifier = getBundleIdentifier(config);
  const appVersion = config.version ?? '1.0.0';
  const widgetTargetName = props.widgetTargetName ?? DEFAULT_WIDGET_TARGET_NAME;
  const widgetBundleIdentifier = props.widgetBundleIdentifier ?? `${bundleIdentifier}.widget`;
  const appGroupIdentifier = props.appGroupIdentifier ?? `group.${bundleIdentifier}`;

  config = withEntitlementsPlist(config, (config) => {
    const appGroups = new Set(
      Array.isArray(config.modResults['com.apple.security.application-groups'])
        ? config.modResults['com.apple.security.application-groups']
        : [],
    );

    appGroups.add(appGroupIdentifier);
    config.modResults['com.apple.security.application-groups'] = Array.from(appGroups);
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    (config) => {
      writeWidgetFiles({
        appGroupIdentifier,
        projectRoot: config.modRequest.projectRoot,
        widgetBundleIdentifier,
        widgetDescription: props.widgetDescription ?? DEFAULT_WIDGET_DESCRIPTION,
        widgetDisplayName: props.widgetDisplayName ?? DEFAULT_WIDGET_DISPLAY_NAME,
        widgetTargetName,
      });
      writeWidgetBridgeFiles({
        appGroupIdentifier,
        projectRoot: config.modRequest.projectRoot,
        widgetTargetName,
      });

      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    config.modResults = addWidgetTargetToXcodeProject(config.modResults, {
      appVersion,
      appGroupIdentifier,
      widgetBundleIdentifier,
      widgetTargetName,
    });
    config.modResults = addWidgetBridgeToXcodeProject(config.modResults);

    return config;
  });

  return config;
}

function getBundleIdentifier(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier;

  if (!bundleIdentifier) {
    throw new Error('withPixelRuneWidget requires expo.ios.bundleIdentifier to be set.');
  }

  return bundleIdentifier;
}

function writeWidgetFiles({
  appGroupIdentifier,
  projectRoot,
  widgetBundleIdentifier,
  widgetDescription,
  widgetDisplayName,
  widgetTargetName,
}) {
  const widgetDirectory = path.join(projectRoot, 'ios', widgetTargetName);

  fs.mkdirSync(widgetDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(widgetDirectory, 'PixelRuneWidget.swift'),
    createWidgetSwift({ appGroupIdentifier, widgetDescription, widgetDisplayName, widgetTargetName }),
  );
  fs.writeFileSync(
    path.join(widgetDirectory, `${widgetTargetName}-Info.plist`),
    createInfoPlist({ widgetBundleIdentifier }),
  );
  fs.writeFileSync(
    path.join(widgetDirectory, `${widgetTargetName}.entitlements`),
    createEntitlementsPlist({ appGroupIdentifier }),
  );
}

function writeWidgetBridgeFiles({
  appGroupIdentifier,
  projectRoot,
  widgetTargetName,
}) {
  const bridgeDirectory = path.join(projectRoot, 'ios', BRIDGE_GROUP_NAME);

  fs.mkdirSync(bridgeDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(bridgeDirectory, 'PixelRuneWidgetBridge.swift'),
    createWidgetBridgeSwift({ appGroupIdentifier, widgetTargetName }),
  );
  fs.writeFileSync(
    path.join(bridgeDirectory, 'PixelRuneWidgetBridge.m'),
    createWidgetBridgeObjC(),
  );
}

function addWidgetTargetToXcodeProject(project, {
  appVersion,
  widgetBundleIdentifier,
  widgetTargetName,
}) {
  const existingTarget = project.pbxTargetByName(widgetTargetName);

  if (existingTarget) {
    return project;
  }

  const target = project.addTarget(widgetTargetName, 'app_extension', widgetTargetName, widgetBundleIdentifier);
  const targetUuid = target.uuid;

  project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);
  project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);

  const group = project.addPbxGroup([], widgetTargetName, widgetTargetName);
  addGroupToMainGroup(project, group.uuid, widgetTargetName);

  project.addSourceFile(
    'PixelRuneWidget.swift',
    { target: targetUuid },
    group.uuid,
  );
  project.addFramework('WidgetKit.framework', { target: targetUuid, weak: false });
  project.addFramework('SwiftUI.framework', { target: targetUuid, weak: false });

  updateWidgetBuildSettings(project, target.pbxNativeTarget.buildConfigurationList, {
    appVersion,
    widgetBundleIdentifier,
    widgetTargetName,
  });

  return project;
}

function addWidgetBridgeToXcodeProject(project) {
  const appTargetUuid = project.getFirstTarget()?.uuid;

  if (!appTargetUuid) {
    return project;
  }

  const group =
    findGroupByName(project, BRIDGE_GROUP_NAME) ??
    project.addPbxGroup([], BRIDGE_GROUP_NAME, BRIDGE_GROUP_NAME);

  addGroupToMainGroup(project, group.uuid ?? group, BRIDGE_GROUP_NAME);
  addSourceFileIfMissing(project, 'PixelRuneWidgetBridge.swift', appTargetUuid, group.uuid ?? group);
  addSourceFileIfMissing(project, 'PixelRuneWidgetBridge.m', appTargetUuid, group.uuid ?? group);
  addFrameworkIfMissing(project, 'WidgetKit.framework', appTargetUuid);

  return project;
}

function findGroupByName(project, groupName) {
  const groupKey = project.findPBXGroupKey({ name: groupName }) ?? project.findPBXGroupKey({ path: groupName });

  if (!groupKey) {
    return null;
  }

  return {
    uuid: groupKey,
    pbxGroup: project.hash.project.objects.PBXGroup[groupKey],
  };
}

function addSourceFileIfMissing(project, filePath, targetUuid, groupUuid) {
  const fileReferenceSection = project.pbxFileReferenceSection();
  const hasFileReference = Object.values(fileReferenceSection).some(
    (fileReference) =>
      fileReference &&
      typeof fileReference === 'object' &&
      (fileReference.path === filePath || fileReference.path === `"${filePath}"`),
  );

  if (hasFileReference) {
    return;
  }

  project.addSourceFile(filePath, { target: targetUuid }, groupUuid);
}

function addFrameworkIfMissing(project, frameworkPath, targetUuid) {
  const frameworkSection = project.pbxFileReferenceSection();
  const hasFramework = Object.values(frameworkSection).some(
    (fileReference) =>
      fileReference &&
      typeof fileReference === 'object' &&
      fileReference.path === frameworkPath,
  );

  if (hasFramework) {
    return;
  }

  project.addFramework(frameworkPath, { target: targetUuid, weak: false });
}

function addGroupToMainGroup(project, groupUuid, groupName) {
  const projectRoot = project.hash.project.rootObject;
  const mainGroupUuid = project.hash.project.objects.PBXProject?.[projectRoot]?.mainGroup;
  const mainGroup = project.hash.project.objects.PBXGroup?.[mainGroupUuid];

  if (!mainGroup?.children) {
    return;
  }

  const hasGroup = mainGroup.children.some((child) => child.value === groupUuid || child.comment === groupName);

  if (!hasGroup) {
    mainGroup.children.push({
      value: groupUuid,
      comment: groupName,
    });
  }
}

function createWidgetBridgeSwift({ appGroupIdentifier, widgetTargetName }) {
  return `import Foundation
import React
import WidgetKit

@objc(PixelRuneWidgetBridge)
class PixelRuneWidgetBridge: NSObject {
    private let appGroupIdentifier = "${appGroupIdentifier}"
    private let activeRunePayloadKey = "activeRunePayload"
    private let widgetKind = "${widgetTargetName}"

    @objc
    static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc(writeActiveRunePayload:resolver:rejecter:)
    func writeActiveRunePayload(
        _ payloadJson: String,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            reject("ERR_APP_GROUP_UNAVAILABLE", "App Group shared UserDefaults is unavailable.", nil)
            return
        }

        userDefaults.set(payloadJson, forKey: activeRunePayloadKey)
        userDefaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }

        resolve([
            "appGroupIdentifier": appGroupIdentifier,
            "key": activeRunePayloadKey,
            "widgetKind": widgetKind
        ])
    }
}
`;
}

function createWidgetBridgeObjC() {
  return `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PixelRuneWidgetBridge, NSObject)

RCT_EXTERN_METHOD(
  writeActiveRunePayload:(NSString *)payloadJson
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
`;
}

function updateWidgetBuildSettings(project, configurationListUuid, {
  appVersion,
  widgetBundleIdentifier,
  widgetTargetName,
}) {
  const configurationList = project.hash.project.objects.XCConfigurationList?.[configurationListUuid];

  for (const buildConfiguration of configurationList?.buildConfigurations ?? []) {
    const configuration =
      project.hash.project.objects.XCBuildConfiguration?.[buildConfiguration.value];

    if (!configuration?.buildSettings) {
      continue;
    }

    configuration.buildSettings.ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = 'YES';
    configuration.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${widgetTargetName}/${widgetTargetName}.entitlements"`;
    configuration.buildSettings.CURRENT_PROJECT_VERSION = 1;
    configuration.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
    configuration.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
    configuration.buildSettings.MARKETING_VERSION = appVersion;
    configuration.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${widgetBundleIdentifier}"`;
    configuration.buildSettings.PRODUCT_NAME = `"${widgetTargetName}"`;
    configuration.buildSettings.SKIP_INSTALL = 'YES';
    configuration.buildSettings.SWIFT_VERSION = '5.0';
    configuration.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
  }
}

function createWidgetSwift({
  appGroupIdentifier,
  widgetDescription,
  widgetDisplayName,
  widgetTargetName,
}) {
  return `import SwiftUI
import WidgetKit

private let appGroupIdentifier = "${appGroupIdentifier}"
private let activeRunePayloadKey = "activeRunePayload"

struct RunePixel: Decodable, Hashable {
    let x: Int
    let y: Int
    let color: String
}

struct Rune: Decodable {
    let id: String
    let name: String
    let width: Int
    let height: Int
    let pixels: [RunePixel]
    let backgroundColor: String?
}

struct ActiveRunePayload: Decodable {
    let version: Int
    let selectedAt: String
    let rune: Rune
}

struct RuneTimelineEntry: TimelineEntry {
    let date: Date
    let payload: ActiveRunePayload?
}

struct RuneTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RuneTimelineEntry {
        RuneTimelineEntry(date: Date(), payload: Self.fallbackPayload())
    }

    func getSnapshot(in context: Context, completion: @escaping (RuneTimelineEntry) -> Void) {
        completion(RuneTimelineEntry(date: Date(), payload: loadPayload() ?? Self.fallbackPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RuneTimelineEntry>) -> Void) {
        let entry = RuneTimelineEntry(date: Date(), payload: loadPayload() ?? Self.fallbackPayload())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60))))
    }

    private func loadPayload() -> ActiveRunePayload? {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier),
              let json = userDefaults.string(forKey: activeRunePayloadKey),
              let data = json.data(using: .utf8) else {
            return nil
        }

        return try? JSONDecoder().decode(ActiveRunePayload.self, from: data)
    }

    static func fallbackPayload() -> ActiveRunePayload {
        ActiveRunePayload(
            version: 1,
            selectedAt: ISO8601DateFormatter().string(from: Date()),
            rune: Rune(
                id: "fallback-heart",
                name: "Heart",
                width: 8,
                height: 8,
                pixels: [
                    RunePixel(x: 2, y: 1, color: "#FF4D8D"),
                    RunePixel(x: 3, y: 1, color: "#FF4D8D"),
                    RunePixel(x: 5, y: 1, color: "#FF4D8D"),
                    RunePixel(x: 6, y: 1, color: "#FF4D8D"),
                    RunePixel(x: 1, y: 2, color: "#FF4D8D"),
                    RunePixel(x: 4, y: 2, color: "#FF4D8D"),
                    RunePixel(x: 7, y: 2, color: "#FF4D8D"),
                    RunePixel(x: 1, y: 3, color: "#FF4D8D"),
                    RunePixel(x: 7, y: 3, color: "#FF4D8D"),
                    RunePixel(x: 2, y: 4, color: "#FF4D8D"),
                    RunePixel(x: 6, y: 4, color: "#FF4D8D"),
                    RunePixel(x: 3, y: 5, color: "#FF4D8D"),
                    RunePixel(x: 5, y: 5, color: "#FF4D8D"),
                    RunePixel(x: 4, y: 6, color: "#FF4D8D")
                ],
                backgroundColor: "#101018"
            )
        )
    }
}

struct RuneWidgetView: View {
    let entry: RuneTimelineEntry

    var body: some View {
        let rune = entry.payload?.rune

        ZStack {
            Color(hex: rune?.backgroundColor ?? "#101018")

            if let rune {
                PixelRuneGrid(rune: rune)
                    .aspectRatio(1, contentMode: .fit)
                    .padding(6)
            }
        }
        .containerBackground(Color(hex: rune?.backgroundColor ?? "#101018"), for: .widget)
    }
}

struct PixelRuneGrid: View {
    let rune: Rune

    var body: some View {
        GeometryReader { geometry in
            let columns = max(rune.width, 1)
            let rows = max(rune.height, 1)
            let cellSize = min(geometry.size.width / CGFloat(columns), geometry.size.height / CGFloat(rows))
            let gridWidth = cellSize * CGFloat(columns)
            let gridHeight = cellSize * CGFloat(rows)
            let offsetX = (geometry.size.width - gridWidth) / 2
            let offsetY = (geometry.size.height - gridHeight) / 2

            ZStack(alignment: .topLeading) {
                ForEach(rune.pixels, id: \\.self) { pixel in
                    Rectangle()
                        .fill(Color(hex: pixel.color))
                        .frame(width: cellSize, height: cellSize)
                        .position(
                            x: offsetX + (CGFloat(pixel.x) + 0.5) * cellSize,
                            y: offsetY + (CGFloat(pixel.y) + 0.5) * cellSize
                        )
                }
            }
        }
    }
}

extension Color {
    init(hex: String) {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&value)

        let red: Double
        let green: Double
        let blue: Double
        let alpha: Double

        switch sanitized.count {
        case 8:
            red = Double((value & 0xFF000000) >> 24) / 255
            green = Double((value & 0x00FF0000) >> 16) / 255
            blue = Double((value & 0x0000FF00) >> 8) / 255
            alpha = Double(value & 0x000000FF) / 255
        case 6:
            red = Double((value & 0xFF0000) >> 16) / 255
            green = Double((value & 0x00FF00) >> 8) / 255
            blue = Double(value & 0x0000FF) / 255
            alpha = 1
        default:
            red = 0.06
            green = 0.06
            blue = 0.09
            alpha = 1
        }

        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

@main
struct ${widgetTargetName}: Widget {
    let kind = "${widgetTargetName}"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RuneTimelineProvider()) { entry in
            RuneWidgetView(entry: entry)
        }
        .configurationDisplayName("${widgetDisplayName}")
        .description("${widgetDescription}")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}
`;
}

function createInfoPlist({ widgetBundleIdentifier }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Pixel Rune</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>${widgetBundleIdentifier}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;
}

function createEntitlementsPlist({ appGroupIdentifier }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupIdentifier}</string>
  </array>
</dict>
</plist>
`;
}

module.exports = withPixelRuneWidget;
