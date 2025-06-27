#!/usr/bin/env python3

import asyncio
import aiohttp
import os

async def test_github_api():
    token = os.getenv('GITHUB_TOKEN')
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    async with aiohttp.ClientSession() as session:
        # Test different API endpoints
        endpoints = [
            'https://api.github.com/orgs/dimension-zero/repos?per_page=5',
            'https://api.github.com/users/dimension-zero/repos?per_page=5'
        ]
        
        for url in endpoints:
            print(f"Testing: {url}")
            async with session.get(url, headers=headers) as resp:
                print(f"Status: {resp.status}")
                data = await resp.json()
                if resp.status == 200:
                    print(f"Found {len(data)} repos:")
                    for repo in data[:3]:
                        print(f"  - {repo['name']}")
                else:
                    print(f"Error: {data.get('message', 'Unknown error')}")
                print()

if __name__ == '__main__':
    asyncio.run(test_github_api())