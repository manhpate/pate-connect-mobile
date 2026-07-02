const { withProjectBuildGradle } = require('@expo/config-plugins');

const AGORA_SCREEN_SHARING_EXCLUDES = `    configurations.configureEach {
        exclude group: "io.agora.rtc", module: "full-screen-sharing"
        exclude group: "io.agora.rtc", module: "full-screen-sharing-special"
    }
`;

const withAgoraNoScreenSharing = (config) =>
  withProjectBuildGradle(config, (gradleConfig) => {
    const { contents } = gradleConfig.modResults;

    if (contents.includes('module: "full-screen-sharing-special"')) {
      return gradleConfig;
    }

    if (contents.includes('allprojects {')) {
      gradleConfig.modResults.contents = contents.replace(
        'allprojects {',
        `allprojects {\n${AGORA_SCREEN_SHARING_EXCLUDES}`
      );
      return gradleConfig;
    }

    gradleConfig.modResults.contents = `${contents.trimEnd()}

allprojects {
${AGORA_SCREEN_SHARING_EXCLUDES}}
`;
    return gradleConfig;
  });

module.exports = withAgoraNoScreenSharing;
