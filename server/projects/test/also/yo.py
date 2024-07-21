from ..goodbye import say_goodbye
from ..hello import say_hello
from ..blah import say_blah

def say_yo():
    say_hello()
    print('Yo!')
    say_blah()
    print('CHANGED')
    say_blah()  # Added second call to say_blah()
    say_goodbye()