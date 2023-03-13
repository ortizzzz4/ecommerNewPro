from urllib import request
import json
#from json import JSONEncoder

#class EmployeeEncoder(JSONEncoder):
 #       def default(self, o):
  #          return o.__dict__



url= 'http://127.0.0.1:8000/api/categorias/listas' #url de test

#f= EmployeeEncoder().encode(response)
#print(f)
respuesta=request.urlopen(url)

conte=respuesta.read()

json_ob = json.loads(conte.decode("utf-8"))


for persona in json_ob:
    print("**************************")
    print(f"title: {persona['title']}")
    print(f"description: {persona['description']}")
    print(f"products: {persona['products']}")
    print(f"created_at: {persona['created_at']}")
    print("****************************")
    print("\n")
    
with open('productos.json','w') as f:
    json.dump(json_ob,f)