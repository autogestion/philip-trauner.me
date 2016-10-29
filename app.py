from Meh import Config, Option, ExceptionInConfigError
from GitHubBridge import GitHub
from sanic import Sanic
from sanic.response import html
import jinja2
import pickle
from os.path import exists

NAME = "philip-trauner.me"
CONFIG_PATH = "philip-trauner.me.cfg"
DUMP_PATH = "github-dump.pickle"

config = Config()
config += Option("address", "0.0.0.0")
config += Option("port", 5000)
config += Option("github_user", "PhilipTrauner")
config += Option("static_url", "")
config += Option("static_handler", False, comment="Serves static files")
config += Option("cache_github", False, comment="Caches repos and orgs when on")
config += Option("debug", False)

try:
    config = config.load(CONFIG_PATH)
except (IOError, ExceptionInConfigError):
    config.dump(CONFIG_PATH)
    config = config.load(CONFIG_PATH)


if config.static_url != "":
	if config.static_url[-1] != "/":
		config.static_url = config.static_url + "/"

static_url = str(config.static_url)

template = jinja2.Template(open("templates/index.html").read())
app = Sanic(NAME)

if config.cache_github:
	if not exists(DUMP_PATH):
		github = GitHub(config.github_user)
		github.force_fetch()
		open(DUMP_PATH, "wb").write(pickle.dumps(github))
	else:
		github = pickle.loads(open(DUMP_PATH, "rb").read())
		github.disable_fetch = True
else:
	github = GitHub(config.github_user)

if config.static_handler:
	app.static('/static', './static')
	static_url = "static/"


@app.route("/")
async def home(request):
	return html(template.render(repos=github.repos, orgs=github.orgs, 
		static_url=static_url))

try:
	app.run(host=config.address, port=config.port, debug=config.debug)
except KeyboardInterrupt:
	app.stop()
