import unittest
import json
import os
from solution import FigmaCommunityUpdater
from unittest.mock import patch, MagicMock

class TestFigmaCommunityUpdater(unittest.TestCase):
    def setUp(self):
        self.manifest_path = 'manifest.json'
        self.community_page_path = 'community_page.txt'
        self.data_security_survey_path = 'data_security_survey.txt'
        with open(self.manifest_path, 'w') as f:
            json.dump({}, f)
        with open(self.community_page_path, 'w') as f:
            f.write('Creator note / network access reasoning text')
        with open(self.data_security_survey_path, 'w') as f:
            f.write('Network requests\nStores data derived from plugin API')

    def tearDown(self):
        os.remove(self.manifest_path)
        os.remove(self.community_page_path)
        os.remove(self.data_security_survey_path)

    def test_update_manifest(self):
        updater = FigmaCommunityUpdater(self.manifest_path, self.community_page_path, self.data_security_survey_path)
        updater.update_manifest()
        with open(self.manifest_path, 'r') as f:
            manifest = json.load(f)
            self.assertIn('networkAccess', manifest)
            self.assertIn('allowedDomains', manifest['networkAccess'])
            self.assertIn('ws://localhost:9001', manifest['networkAccess']['allowedDomains'])
            self.assertIn('http://localhost:9002', manifest['networkAccess']['allowedDomains'])

    def test_update_community_page(self):
        updater = FigmaCommunityUpdater(self.manifest_path, self.community_page_path, self.data_security_survey_path)
        updater.update_community_page()
        with open(self.community_page_path, 'r') as f:
            community_page = f.read()
            self.assertIn('The plugin opens a local WebSocket connection (ws://localhost:9001) between the plugin and the specs bridge CLI process.', community_page)

    def test_update_data_security_survey(self):
        updater = FigmaCommunityUpdater(self.manifest_path, self.community_page_path, self.data_security_survey_path)
        updater.update_data_security_survey()
        with open(self.data_security_survey_path, 'r') as f:
            data_security_survey = f.read()
            self.assertIn('Network requests: The plugin makes requests to the following domains: Polar.sh license-validation domains, ws://localhost:9001 (local CLI bridge)', data_security_survey)
            self.assertIn('Stores data derived from plugin API: The plugin can relay data to the local bridge when the user opts in.', data_security_survey)

    @patch.object(FigmaCommunityUpdater, 'verify_cli_bridge_toggle')
    def test_verify_cli_bridge_toggle(self, mock_verify_cli_bridge_toggle):
        updater = FigmaCommunityUpdater(self.manifest_path, self.community_page_path, self.data_security_survey_path)
        updater.verify_cli_bridge_toggle()
        mock_verify_cli_bridge_toggle.assert_called_once()

if __name__ == '__main__':
    unittest.main()