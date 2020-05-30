import aiohttp
import os

from sanic import response, Blueprint
from jinja2 import Environment, PackageLoader

from pubgate.utils.networking import fetch

philip_v1 = Blueprint('index')

philip_dir = os.path.dirname(os.path.abspath(__file__))
philip_v1.static('/static', f'{philip_dir}/public')

jinja_env = Environment(
    loader=PackageLoader("philip", "public"), trim_blocks=True, lstrip_blocks=True
)


@philip_v1.route('/', methods=['GET'])
@philip_v1.route('/local', methods=['GET'])
@philip_v1.route('/federated', methods=['GET'])
@philip_v1.route('/inbox', methods=['GET'])
@philip_v1.route('/create', methods=['GET'])
@philip_v1.route('/search', methods=['GET'])
@philip_v1.route('/profile', methods=['GET'])
@philip_v1.route('/about', methods=['GET'])
async def home(request, **kwargs):
    return response.html(
        jinja_env.get_template("svelte_home.jinja").render(
            static_url="static/",
            conf=request.app.config,
        )
    )


@philip_v1.route('/proxy', methods=['POST'])
async def proxy(request, **kwargs):
    try:
        status_code, result = await fetch(request.json["url"],
                                          pass_through=True)
    except aiohttp.ClientConnectorError:
        status_code = 200
        result = {'error': 'Refused to connect'}
    return response.json(result, status=status_code)
