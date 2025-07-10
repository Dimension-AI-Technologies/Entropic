# Makefile for PolyScript C Foundation Library

CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -fPIC -O2 -I../include
LDFLAGS = -shared

# Platform detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    TARGET = libpolyscript_c.so
    LDFLAGS += -Wl,-soname,$(TARGET)
endif
ifeq ($(UNAME_S),Darwin)
    TARGET = libpolyscript_c.dylib
    LDFLAGS += -dynamiclib -install_name @rpath/$(TARGET)
endif
ifeq ($(OS),Windows_NT)
    TARGET = polyscript_c.dll
    LDFLAGS = -shared -Wl,--out-implib,libpolyscript_c.a
endif

# Source files
SRCS = polyscript_c.c
OBJS = $(SRCS:.c=.o)

# Test files
TEST_SRCS = test_c_foundation.c
TEST_TARGET = test_c_foundation

.PHONY: all clean test install

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

test: $(TEST_TARGET)
	./$(TEST_TARGET)

$(TEST_TARGET): $(TEST_SRCS) $(TARGET)
	$(CC) $(CFLAGS) -o $@ $(TEST_SRCS) -L. -lpolyscript_c -Wl,-rpath,.

clean:
	rm -f $(OBJS) $(TARGET) $(TEST_TARGET) *.a

install: $(TARGET)
	mkdir -p /usr/local/lib
	cp $(TARGET) /usr/local/lib/
	mkdir -p /usr/local/include/polyscript
	cp ../include/polyscript_ffi.h /usr/local/include/polyscript/

# Debug build
debug: CFLAGS += -g -DDEBUG
debug: clean all

# Static library build
static: libpolyscript_c.a

libpolyscript_c.a: $(OBJS)
	ar rcs $@ $^