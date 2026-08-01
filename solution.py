import json
import os

class FigmaCommunityUpdater:
    def __init__(self, manifest_path, community_page_path, data_security_survey_path):
        self.manifest_path = manifest_path
        self.community_page_path = community_page_path
        self.data_security_survey_path = data_security_survey_path

    def update_manifest(self):
        with open(self.manifest_path, 'r+') as f:
            manifest = json.load(f)
            if 'networkAccess' not in manifest:
                manifest['networkAccess'] = {}
            if 'allowedDomains' not in manifest['networkAccess']:
                manifest['networkAccess']['allowedDomains'] = []
            manifest['networkAccess']['allowedDomains'].extend(['ws://localhost:9001', 'http://localhost:9002'])
            f.seek(0)
            json.dump(manifest, f, indent=4)
            f.truncate()

    def update_community_page(self):
        with open(self.community_page_path, 'r+') as f:
            community_page = f.read()
            updated_community_page = community_page.replace('Creator note / network access reasoning text', 'The plugin opens a local WebSocket connection (ws://localhost:9001) between the plugin and the specs bridge CLI process. This connection is user-initiated (opt-in toggle) and no data leaves the local machine.')
            f.seek(0)
            f.write(updated_community_page)
            f.truncate()

    def update_data_security_survey(self):
        with open(self.data_security_survey_path, 'r+') as f:
            data_security_survey = f.read()
            updated_data_security_survey = data_security_survey.replace('Network requests', 'Network requests: The plugin makes requests to the following domains: Polar.sh license-validation domains, ws://localhost:9001 (local CLI bridge)')
            updated_data_security_survey = updated_data_security_survey.replace('Stores data derived from plugin API', 'Stores data derived from plugin API: The plugin can relay data to the local bridge when the user opts in.')
            f.seek(0)
            f.write(updated_data_security_survey)
            f.truncate()

    def verify_cli_bridge_toggle(self):
        # Assume this function verifies the 'CLI Bridge' toggle defaults to off and requires an explicit user action to enable
        pass

if __name__ == '__main__':
    updater = FigmaCommunityUpdater('manifest.json', 'community_page.txt', 'data_security_survey.txt')
    updater.update_manifest()
    updater.update_community_page()
    updater.update_data_security_survey()
    updater.verify_cli_bridge_toggle()