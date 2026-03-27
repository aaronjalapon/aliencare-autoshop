<?php

it('returns a successful response from the health endpoint', function () {
    $response = $this->getJson('/api/health');

    $response->assertOk()
        ->assertJsonStructure(['success', 'status', 'database', 'timestamp', 'version']);
});
